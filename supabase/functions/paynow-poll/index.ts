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

    const { reference, poll_url } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({ error: "reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check our local status first
    const { data: txn } = await adminClient
      .from("paynow_transactions")
      .select("status, payment_type")
      .eq("reference", reference)
      .single();

    if (!txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (txn.status === "completed") {
      return new Response(JSON.stringify({ status: "completed", paid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (txn.status === "failed") {
      return new Response(JSON.stringify({ status: "failed", paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If still pending and we have a poll URL, check Paynow
    if (poll_url) {
      try {
        const pollRes = await fetch(poll_url);
        const pollText = await pollRes.text();
        const pairs = pollText.split("&");
        const parsed: Record<string, string> = {};
        for (const pair of pairs) {
          const [key, ...rest] = pair.split("=");
          parsed[decodeURIComponent(key).toLowerCase()] = decodeURIComponent(rest.join("="));
        }

        const paynowStatus = (parsed.status || "").toLowerCase();
        if (paynowStatus === "paid" || paynowStatus === "delivered") {
          return new Response(JSON.stringify({ status: "completed", paid: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else if (paynowStatus === "cancelled") {
          return new Response(JSON.stringify({ status: "failed", paid: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }

    return new Response(JSON.stringify({ status: "pending", paid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Poll error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
