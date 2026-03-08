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

    // ==================== SEED ADMIN ====================
    if (action === "seed-admin") {
      const { data: existingUsers } =
        await supabaseAdmin.auth.admin.listUsers();
      const adminExists = existingUsers?.users?.some(
        (u) => u.email === "admin@giffordhigh.com"
      );
      if (adminExists) {
        return new Response(
          JSON.stringify({ message: "Admin already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "admin" });

      return new Response(
        JSON.stringify({ message: "Admin seeded successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== SEED TEACHER ====================
    if (action === "seed-teacher") {
      const { email, password, full_name, department } = payload;
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u) => u.email === email);
      if (exists) {
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

    // ==================== CREATE USER (unified) ====================
    if (action === "create-user") {
      const { email, password, full_name, portal_role, staff_role, department, phone, grade, class_name } = payload;

      if (!email || !password || !full_name || !portal_role) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u) => u.email === email);
      if (exists) {
        return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) throw createError;

      const userId = newUser.user.id;

      // Assign portal role (admin, teacher, student, parent)
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: portal_role });

      // Update profile
      await supabaseAdmin.from("profiles").update({ phone: phone || null, grade: grade || null, class_name: class_name ? `${grade || ""}${class_name}` : null }).eq("id", userId);

      // If staff role (teacher or admin), add to staff table
      if (portal_role === "teacher" || portal_role === "admin") {
        const category = ["principal", "deputy_principal", "hod", "teacher", "senior_teacher", "sports_director"].includes(staff_role || "")
          ? "teaching"
          : ["bursar", "secretary"].includes(staff_role || "")
            ? "administrative"
            : ["principal", "deputy_principal"].includes(staff_role || "")
              ? "leadership"
              : "general";

        // Determine proper category
        let staffCategory = "teaching";
        if (["principal", "deputy_principal"].includes(staff_role || "")) staffCategory = "leadership";
        else if (["bursar", "secretary"].includes(staff_role || "")) staffCategory = "administrative";
        else if (["groundsman", "matron"].includes(staff_role || "")) staffCategory = "general";

        await supabaseAdmin.from("staff").insert({
          full_name,
          email,
          phone: phone || null,
          department: department || null,
          user_id: userId,
          category: staffCategory,
          role: staff_role || "teacher",
        });
      }

      return new Response(JSON.stringify({ message: "User created successfully", user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== LIST USERS ====================
    if (action === "list-users") {
      const { data: allRoles } = await supabaseAdmin.from("user_roles").select("user_id, role");
      const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id, full_name, email");
      const { data: allStaff } = await supabaseAdmin.from("staff").select("user_id, role, department");

      const roleMap: Record<string, string> = {};
      (allRoles || []).forEach((r) => { roleMap[r.user_id] = r.role; });

      const staffMap: Record<string, { role: string; department: string | null }> = {};
      (allStaff || []).forEach((s) => {
        if (s.user_id) staffMap[s.user_id] = { role: s.role || "", department: s.department };
      });

      const users = (allProfiles || []).map((p) => ({
        id: p.id,
        email: p.email || "",
        full_name: p.full_name || "",
        portal_role: roleMap[p.id] || "unknown",
        staff_role: staffMap[p.id]?.role || null,
        department: staffMap[p.id]?.department || null,
        created_at: "",
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== RESET PASSWORD ====================
    if (action === "reset-password") {
      const { user_id, password: newPassword } = payload;
      if (!user_id || !newPassword) {
        return new Response(JSON.stringify({ error: "user_id and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: newPassword });
      if (error) throw error;
      return new Response(JSON.stringify({ message: "Password reset successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== DELETE USER ====================
    if (action === "delete-user") {
      const { user_id } = payload;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Delete from user_roles, staff, profiles first (cascade should handle some)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("staff").delete().eq("user_id", user_id);
      // Delete auth user (cascades to profiles)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== LEGACY: register-student ====================
    if (action === "register-student") {
      const { email, password, full_name, grade, class_name, phone } = payload;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (createError) throw createError;
      await supabaseAdmin.from("profiles").update({ grade, class_name, phone }).eq("id", newUser.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "student" });
      return new Response(JSON.stringify({ message: "Student registered", user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== LEGACY: register-teacher ====================
    if (action === "register-teacher") {
      const { email, password, full_name, department, phone } = payload;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (createError) throw createError;
      await supabaseAdmin.from("profiles").update({ phone }).eq("id", newUser.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "teacher" });
      await supabaseAdmin.from("staff").insert({ full_name, email, phone, department, user_id: newUser.user.id });
      return new Response(JSON.stringify({ message: "Teacher registered", user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== LEGACY: get-students ====================
    if (action === "get-students") {
      const { data: studentRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "student");
      if (!studentRoles || studentRoles.length === 0) {
        return new Response(JSON.stringify({ students: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const studentIds = studentRoles.map((r) => r.user_id);
      const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("id", studentIds);
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
