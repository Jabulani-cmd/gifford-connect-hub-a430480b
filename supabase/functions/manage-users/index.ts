import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...payload } = await req.json();

    // Verify caller is admin (except for seed actions which bootstrap)
    if (action !== "seed-admin" && action !== "seed-teacher") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin && action !== "get-students") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "seed-admin") {
      // Check if admin already exists
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers();
      const adminExists = existingUsers?.users?.some(
        (u) => u.email === "admin@giffordhigh.com"
      );
      if (adminExists) {
        return new Response(
          JSON.stringify({ message: "Admin already exists" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: "admin@giffordhigh.com",
          password: "GiffordAdmin2026$",
          email_confirm: true,
          user_metadata: { full_name: "System Administrator" },
        });

      if (createError) throw createError;

      // Assign admin role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "admin" });

      return new Response(
        JSON.stringify({ message: "Admin seeded successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "seed-teacher") {
      const { email, password, full_name, department } = payload;
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u) => u.email === email);
      if (exists) {
        // Update password for existing teacher
        const existingUser = existingUsers?.users?.find((u) => u.email === email);
        if (existingUser && password) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
        }
        return new Response(JSON.stringify({ message: "Teacher already exists, password updated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name || "Teacher" },
      });
      if (createError) throw createError;
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "teacher" });
      await supabaseAdmin.from("staff").insert({
        full_name: full_name || "Teacher", email, department, user_id: newUser.user.id, category: "teaching",
      });
      return new Response(JSON.stringify({ message: "Teacher seeded", user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register-student") {
      const { email, password, full_name, grade, class_name, phone } = payload;

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

      if (createError) throw createError;

      // Update profile with extra fields
      await supabaseAdmin
        .from("profiles")
        .update({ grade, class_name, phone })
        .eq("id", newUser.user.id);

      // Assign student role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "student" });

      return new Response(
        JSON.stringify({
          message: "Student registered",
          user_id: newUser.user.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "register-teacher") {
      const { email, password, full_name, department, phone } = payload;

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

      if (createError) throw createError;

      await supabaseAdmin
        .from("profiles")
        .update({ phone })
        .eq("id", newUser.user.id);

      // Assign teacher role
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "teacher" });

      // Add to staff table
      await supabaseAdmin.from("staff").insert({
        full_name,
        email,
        phone,
        department,
        user_id: newUser.user.id,
      });

      return new Response(
        JSON.stringify({
          message: "Teacher registered",
          user_id: newUser.user.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "get-students") {
      // Get all users with student role
      const { data: studentRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (!studentRoles || studentRoles.length === 0) {
        return new Response(JSON.stringify({ students: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const studentIds = studentRoles.map((r) => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .in("id", studentIds);

      return new Response(JSON.stringify({ students: profiles || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
