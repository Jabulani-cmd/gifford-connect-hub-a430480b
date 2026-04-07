import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (digits.startsWith("263") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

function getPaynowTestOutcome(phone: string): { status: "completed" | "failed"; message: string } | null {
  switch (phone) {
    case "0771111111":
      return { status: "completed", message: "TEST MODE: EcoCash payment approved successfully." };
    case "0773333333":
      return { status: "failed", message: "TEST MODE: Payment was cancelled by the user." };
    case "0774444444":
      return { status: "failed", message: "TEST MODE: Payment failed because of insufficient balance." };
    default:
      return null;
  }
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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
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
    const merchantTestEmail = Deno.env.get("PAYNOW_TEST_EMAIL")?.trim() || "";
    const isDemoMode = !integrationId || !integrationKey;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const reference = `GHS-${payment_type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const normalizedPhone = normalizePhoneNumber(phone || "");
    const isMobileMoney = method === "ecocash" || method === "onemoney";

    // Build description
    let description = "";
    let studentName = "";
    let studentAdmissionNumber = "";
    if (payment_type === "subscription" && subscription_id) {
      const { data: sub } = await adminClient
        .from("portal_subscriptions")
        .select("*, students(full_name, admission_number)")
        .eq("id", subscription_id)
        .single();
      studentName = sub?.students?.full_name || "Student";
      studentAdmissionNumber = sub?.students?.admission_number || "";
      description = `Portal subscription for ${studentName} (${currency.toUpperCase()})`;
    } else if (payment_type === "fees" && invoice_id) {
      const { data: inv } = await adminClient
        .from("invoices")
        .select("invoice_number, students(full_name, admission_number)")
        .eq("id", invoice_id)
        .single();
      studentName = inv?.students?.full_name || "Student";
      studentAdmissionNumber = inv?.students?.admission_number || "";
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
        student_number: studentAdmissionNumber || null,
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

    const paynowTestOutcome = merchantTestEmail && isMobileMoney
      ? getPaynowTestOutcome(normalizedPhone)
      : null;

    if (paynowTestOutcome) {
      const paynowReference = `TEST-${Date.now()}`;

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
        status: paynowTestOutcome.status,
        paynow_reference: paynowReference,
      });

      if (payment_type === "subscription" && subscription_id) {
        await adminClient
          .from("portal_payments")
          .update({
            status: paynowTestOutcome.status,
            stripe_payment_intent_id: paynowReference,
          })
          .eq("stripe_checkout_session_id", reference);
      } else if (payment_type === "fees") {
        await adminClient
          .from("online_payments")
          .update({
            status: paynowTestOutcome.status,
            completed_at: paynowTestOutcome.status === "completed" ? new Date().toISOString() : null,
            stripe_payment_intent_id: paynowReference,
          })
          .eq("stripe_checkout_session_id", reference);
      }

      if (paynowTestOutcome.status === "completed") {
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
              title: "Payment Successful (Test Mode)",
              message: "Your portal subscription is now active. Full portal access has been granted.",
              type: "payment",
            });
          }
        }

        if (payment_type === "fees" && student_id) {
          const receiptNumber = `TEST-${Date.now().toString(36).toUpperCase()}`;
          if (invoice_id) {
            await adminClient.from("payments").insert({
              student_id,
              invoice_id,
              amount_usd: currency === "usd" ? parseFloat(amount) : 0,
              amount_zig: currency === "zig" ? parseFloat(amount) : 0,
              payment_method: `paynow_${method || "web"}_test`,
              receipt_number: receiptNumber,
              reference_number: paynowReference,
              notes: `Test payment via Paynow (${(method || "web").toUpperCase()})`,
            });
          }

          if (userId) {
            await adminClient.from("notifications").insert({
              user_id: userId,
              title: "Fee Payment Received (Test Mode)",
              message: `Your school fee payment of ${currency.toUpperCase()} ${parseFloat(amount).toFixed(2)} has been recorded.`,
              type: "payment",
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          demo: true,
          test: true,
          method,
          message: paynowTestOutcome.message,
          reference,
          poll_url: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (userId) {
        await adminClient.from("notifications").insert({
          user_id: userId,
          title: "Payment Failed (Test Mode)",
          message: paynowTestOutcome.message,
          type: "payment",
        });
      }

      return new Response(JSON.stringify({
        error: paynowTestOutcome.message,
        test: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIVE MODE (Paynow keys configured) ──────────────────────
    const origin = req.headers.get("origin") || "https://gifford-connect-hub.lovable.app";
    const resultUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paynow-callback`;
    const returnUrl = `${origin}/portal/parent-teacher?payment=success&ref=${reference}`;
    const authEmail = (method === "ecocash" || method === "onemoney")
      ? (merchantTestEmail || email || "")
      : (email || "");

    const fields: Record<string, string> = {
      id: integrationId,
      reference,
      amount: parseFloat(amount).toFixed(2),
      additionalinfo: description,
      returnurl: returnUrl,
      resulturl: resultUrl,
      authemail: authEmail,
      status: "Message",
    };

    const hashValues = [
      fields.id, fields.reference, fields.amount, fields.additionalinfo,
      fields.returnurl, fields.resulturl, fields.authemail, fields.status,
    ];

    if (method === "ecocash" || method === "onemoney") {
      fields.phone = normalizedPhone;
      fields.method = method;
      hashValues.push(fields.phone, fields.method);
    }

    fields.hash = await generateHash(hashValues, integrationKey);

    const paynowUrl = (method === "ecocash" || method === "onemoney") ? PAYNOW_MOBILE_URL : PAYNOW_INITIATE_URL;

    const formBody = Object.entries(fields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    let paynowRes: Response;
    try {
      // Force HTTP/1.1 — Paynow runs on IIS which resets HTTP/2 connections
      const httpClient = Deno.createHttpClient({ http1: true, http2: false });
      paynowRes = await fetch(paynowUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
        // @ts-ignore Deno-specific option
        client: httpClient,
      });
    } catch (fetchErr) {
      const isMobileMoney = method === "ecocash" || method === "onemoney";
      console.error("Payment error:", fetchErr);
      return new Response(JSON.stringify({
        error: isMobileMoney
          ? "Paynow mobile money test mode could not be reached. If your integration is still in test mode, set PAYNOW_TEST_EMAIL to the merchant login email and use Paynow test numbers like 0771111111."
          : "Paynow could not be reached. Please try again shortly.",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
