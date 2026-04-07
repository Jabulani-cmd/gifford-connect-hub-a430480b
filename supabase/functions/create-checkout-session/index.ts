import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const { subscription_id } = await req.json();

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscription details
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sub, error: subErr } = await adminClient
      .from("portal_subscriptions")
      .select("*, students(full_name, admission_number)")
      .eq("id", subscription_id)
      .eq("parent_id", userId)
      .single();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment system not configured. Please contact the school administration." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    const studentName = sub.students?.full_name || "Student";
    const amount = Math.round((sub.amount_usd || 10) * 100); // cents

    // Create Stripe Checkout Session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": amount.toString(),
        "line_items[0][price_data][product_data][name]": `Portal Access - ${studentName}`,
        "line_items[0][price_data][product_data][description]": "School portal access subscription (per term)",
        "line_items[0][quantity]": "1",
        "customer_email": profile?.email || "",
        "metadata[subscription_id]": subscription_id,
        "metadata[parent_id]": userId,
        "metadata[student_id]": sub.student_id,
        "success_url": `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/portal/parent-teacher?payment=success`,
        "cancel_url": `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/portal/parent-teacher?payment=cancelled`,
      }),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending payment
    await adminClient.from("portal_payments").insert({
      subscription_id,
      amount_usd: sub.amount_usd || 10,
      currency: "usd",
      status: "pending",
      stripe_checkout_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
