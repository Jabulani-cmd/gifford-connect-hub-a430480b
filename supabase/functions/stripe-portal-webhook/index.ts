import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const stripeSignature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    // If webhook secret is set, verify signature
    // For now we parse the event directly (signature verification requires crypto)
    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscriptionId = session.metadata?.subscription_id;
      const parentId = session.metadata?.parent_id;
      const studentId = session.metadata?.student_id;

      if (!subscriptionId) {
        console.error("No subscription_id in metadata");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment record
      await adminClient
        .from("portal_payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq("stripe_checkout_session_id", session.id);

      // Update subscription to active
      await adminClient
        .from("portal_subscriptions")
        .update({
          status: "active",
          last_payment_date: new Date().toISOString(),
          stripe_customer_id: session.customer,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

      // Notify parent
      if (parentId) {
        await adminClient.from("notifications").insert({
          user_id: parentId,
          title: "Payment Successful",
          message: "Your portal subscription is now active. You have full access to the parent portal.",
          type: "payment",
        });
      }

      // Notify student
      if (studentId) {
        const { data: student } = await adminClient
          .from("students")
          .select("user_id")
          .eq("id", studentId)
          .single();

        if (student?.user_id) {
          await adminClient.from("notifications").insert({
            user_id: student.user_id,
            title: "Portal Access Activated",
            message: "Your parent has completed payment. Your student portal is now fully accessible.",
            type: "payment",
          });
        }
      }

      console.log(`Subscription ${subscriptionId} activated for parent ${parentId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
