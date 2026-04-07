import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parsePaynowResponse(responseText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = responseText.split("&");
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    result[decodeURIComponent(key).toLowerCase()] = decodeURIComponent(rest.join("="));
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const parsed = parsePaynowResponse(body);

    console.log("Paynow callback received:", JSON.stringify(parsed));

    const reference = parsed.reference;
    const status = (parsed.status || "").toLowerCase();
    const paynowReference = parsed.paynowreference || "";

    if (!reference) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up transaction
    const { data: txn } = await adminClient
      .from("paynow_transactions")
      .select("*")
      .eq("reference", reference)
      .single();

    if (!txn) {
      console.error("Transaction not found for reference:", reference);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Map Paynow status
    let newStatus = "pending";
    if (status === "paid" || status === "delivered") {
      newStatus = "completed";
    } else if (status === "cancelled" || status === "refunded" || status === "disputed") {
      newStatus = "failed";
    } else if (status === "sent" || status === "awaiting delivery") {
      newStatus = "pending";
    }

    // Update paynow_transactions
    await adminClient
      .from("paynow_transactions")
      .update({
        status: newStatus,
        paynow_reference: paynowReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id);

    if (newStatus === "completed") {
      // Handle subscription payment
      if (txn.payment_type === "subscription" && txn.subscription_id) {
        // Update portal_payments
        await adminClient
          .from("portal_payments")
          .update({ status: "completed", stripe_payment_intent_id: paynowReference })
          .eq("stripe_checkout_session_id", reference);

        // Activate subscription
        await adminClient
          .from("portal_subscriptions")
          .update({
            status: "active",
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", txn.subscription_id);

        // Notify parent
        if (txn.parent_id) {
          await adminClient.from("notifications").insert({
            user_id: txn.parent_id,
            title: "Payment Successful",
            message: "Your portal subscription is now active via Paynow. You have full access to the parent portal.",
            type: "payment",
          });
        }

        // Notify student
        if (txn.student_id) {
          const { data: student } = await adminClient
            .from("students")
            .select("user_id")
            .eq("id", txn.student_id)
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
      }

      // Handle fee payment
      if (txn.payment_type === "fees" && txn.invoice_id) {
        // Update online_payments using the stored payment reference
        await adminClient
          .from("online_payments")
          .update({ status: "completed", completed_at: new Date().toISOString(), stripe_payment_intent_id: paynowReference || reference })
          .eq("stripe_checkout_session_id", reference);

        // Create payment record
        if (txn.student_id) {
          const receiptNumber = `PNW-${Date.now().toString(36).toUpperCase()}`;
          await adminClient.from("payments").insert({
            student_id: txn.student_id,
            invoice_id: txn.invoice_id,
            amount_usd: txn.currency === "usd" ? txn.amount : 0,
            amount_zig: txn.currency === "zig" ? txn.amount : 0,
            payment_method: `paynow_${txn.method}`,
            receipt_number: receiptNumber,
            reference_number: paynowReference || reference,
            notes: `Online payment via Paynow (${txn.method.toUpperCase()})`,
          });
        }

        // Notify parent
        if (txn.parent_id) {
          await adminClient.from("notifications").insert({
            user_id: txn.parent_id,
            title: "Fee Payment Received",
            message: `Your school fee payment of ${txn.currency.toUpperCase()} ${txn.amount} has been received successfully.`,
            type: "payment",
          });
        }
      }
    } else if (newStatus === "failed") {
      // Notify parent of failure
      if (txn.parent_id) {
        await adminClient.from("notifications").insert({
          user_id: txn.parent_id,
          title: "Payment Failed",
          message: `Your payment of ${txn.currency.toUpperCase()} ${txn.amount} was not completed. Please try again.`,
          type: "payment",
        });
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
