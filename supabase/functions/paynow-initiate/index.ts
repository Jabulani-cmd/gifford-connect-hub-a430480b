import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const PAYNOW_INITIATE_URL = "https://www.paynow.co.zw/interface/initiatetransaction";
const PAYNOW_MOBILE_URL = "https://www.paynow.co.zw/interface/remotetransaction";

async function generateHash(values: string[], integrationKey: string): Promise<string> {
  const rawString = values.join("") + integrationKey;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parsePaynowResponse(responseText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = responseText.split("&");
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    result[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }
  return result;
}

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
    const body = await req.json();
    const {
      payment_type,
      subscription_id,
      invoice_id,
      student_id,
      amount,
      currency = "usd",
      method,
      phone,
      email,
    } = body;

    if (!payment_type || !amount) {
      return new Response(JSON.stringify({ error: "payment_type and amount are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((method === "ecocash" || method === "onemoney") && !phone) {
      return new Response(JSON.stringify({ error: "Phone number is required for mobile money payments" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
    const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
    const isDemoMode = !integrationId || !integrationKey;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reference = `GHS-${payment_type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Build description
    let description = "";
    let studentName = "";
    if (payment_type === "subscription" && subscription_id) {
      const { data: sub } = await adminClient
        .from("portal_subscriptions")
        .select("*, students(full_name, admission_number)")
        .eq("id", subscription_id)
        .single();
      studentName = sub?.students?.full_name || "Student";
      description = `Portal subscription for ${studentName} (${currency.toUpperCase()})`;
    } else if (payment_type === "fees" && invoice_id) {
      const { data: inv } = await adminClient
        .from("invoices")
        .select("*, students(full_name, admission_number)")
        .eq("id", invoice_id)
        .single();
      studentName = inv?.students?.full_name || "Student";
      description = `School fees for ${studentName} - ${inv?.invoice_number || ""} (${currency.toUpperCase()})`;
    } else {
      description = `Payment - Gifford High School (${currency.toUpperCase()})`;
    }

    // Store in portal_payments or online_payments
    if (payment_type === "subscription" && subscription_id) {
      await adminClient.from("portal_payments").insert({
        subscription_id,
        amount_usd: currency === "usd" ? parseFloat(amount) : 0,
        currency,
        status: isDemoMode ? "completed" : "pending",
        stripe_checkout_session_id: reference,
      });
    } else if (payment_type === "fees") {
      await adminClient.from("online_payments").insert({
        payer_name: studentName || "Parent",
        payer_email: email || "",
        payer_phone: phone || null,
        amount_usd: currency === "usd" ? parseFloat(amount) : 0,
        currency,
        payment_type: "fees",
        status: isDemoMode ? "completed" : "pending",
        student_id: student_id || null,
        student_number: reference,
        stripe_checkout_session_id: reference,
      });
    }

    // ─── DEMO MODE ───────────────────────────────────────────────
    if (isDemoMode) {
      console.log("DEMO MODE: Paynow keys not configured. Simulating successful payment.");

      // Store transaction as completed immediately
      await adminClient.from("paynow_transactions").insert({
        reference,
        poll_url: null,
        browser_url: null,
        payment_type,
        subscription_id: subscription_id || null,
        invoice_id: invoice_id || null,
        student_id: student_id || null,
        parent_id: userId,
        amount: parseFloat(amount),
        currency,
        method: method || "web",
        status: "completed",
        paynow_reference: `DEMO-${Date.now()}`,
      });

      // Auto-activate subscription if applicable
      if (payment_type === "subscription" && subscription_id) {
        await adminClient
          .from("portal_subscriptions")
          .update({
            status: "active",
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription_id);

        if (userId) {
          await adminClient.from("notifications").insert({
            user_id: userId,
            title: "Payment Successful (Demo)",
            message: "Your portal subscription is now active. Full portal access has been granted.",
            type: "payment",
          });
        }
      }

      // Auto-process fee payment
      if (payment_type === "fees" && student_id) {
        const receiptNumber = `DEMO-${Date.now().toString(36).toUpperCase()}`;
        if (invoice_id) {
          await adminClient.from("payments").insert({
            student_id,
            invoice_id,
            amount_usd: currency === "usd" ? parseFloat(amount) : 0,
            amount_zig: currency === "zig" ? parseFloat(amount) : 0,
            payment_method: `paynow_${method || "web"}_demo`,
            receipt_number: receiptNumber,
            reference_number: reference,
            notes: `Demo payment via Paynow (${(method || "web").toUpperCase()})`,
          });
        }

        if (userId) {
          await adminClient.from("notifications").insert({
            user_id: userId,
            title: "Fee Payment Received (Demo)",
            message: `Your school fee payment of ${currency.toUpperCase()} ${parseFloat(amount).toFixed(2)} has been recorded.`,
            type: "payment",
          });
        }
      }

      // Return success immediately for mobile money
      if (method === "ecocash" || method === "onemoney") {
        return new Response(JSON.stringify({
          success: true,
          demo: true,
          method,
          message: `DEMO MODE: Payment of ${currency.toUpperCase()} ${parseFloat(amount).toFixed(2)} simulated successfully. In production, a prompt will be sent to ${phone}.`,
          reference,
          poll_url: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For web payment, return success (no redirect needed in demo)
      return new Response(JSON.stringify({
        success: true,
        demo: true,
        method: "web",
        message: `DEMO MODE: Payment of ${currency.toUpperCase()} ${parseFloat(amount).toFixed(2)} simulated successfully.`,
        redirect_url: null,
        reference,
        poll_url: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIVE MODE (Paynow keys configured) ──────────────────────
    const origin = req.headers.get("origin") || "https://gifford-connect-hub.lovable.app";
    const resultUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paynow-callback`;
    const returnUrl = `${origin}/portal/parent-teacher?payment=success&ref=${reference}`;

    const fields: Record<string, string> = {
      id: integrationId,
      reference,
      amount: parseFloat(amount).toFixed(2),
      additionalinfo: description,
      returnurl: returnUrl,
      resulturl: resultUrl,
      authemail: email || "",
      status: "Message",
    };

    const hashValues = [
      fields.id, fields.reference, fields.amount, fields.additionalinfo,
      fields.returnurl, fields.resulturl, fields.authemail, fields.status,
    ];

    if (method === "ecocash" || method === "onemoney") {
      fields.phone = phone;
      fields.method = method;
      hashValues.push(fields.phone, fields.method);
    }

    fields.hash = await generateHash(hashValues, integrationKey);

    const paynowUrl = (method === "ecocash" || method === "onemoney") ? PAYNOW_MOBILE_URL : PAYNOW_INITIATE_URL;

    const formBody = Object.entries(fields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const paynowRes = await fetch(paynowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody,
    });

    const responseText = await paynowRes.text();
    const parsed = parsePaynowResponse(responseText);

    if (parsed.status?.toLowerCase() === "error" || parsed.Status?.toLowerCase() === "error") {
      const errMsg = parsed.error || parsed.Error || "Payment initiation failed";
      console.error("Paynow error:", errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("paynow_transactions").insert({
      reference,
      poll_url: parsed.pollurl || parsed.PollUrl || null,
      browser_url: parsed.browserurl || parsed.BrowserUrl || null,
      payment_type,
      subscription_id: subscription_id || null,
      invoice_id: invoice_id || null,
      student_id: student_id || null,
      parent_id: userId,
      amount: parseFloat(amount),
      currency,
      method: method || "web",
      status: "pending",
    });

    const browserUrl = parsed.browserurl || parsed.BrowserUrl;
    const pollUrl = parsed.pollurl || parsed.PollUrl;

    if (method === "ecocash" || method === "onemoney") {
      return new Response(JSON.stringify({
        success: true,
        method,
        message: `A payment prompt has been sent to ${phone}. Please enter your PIN to authorize the payment.`,
        reference,
        poll_url: pollUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      method: "web",
      redirect_url: browserUrl,
      reference,
      poll_url: pollUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
