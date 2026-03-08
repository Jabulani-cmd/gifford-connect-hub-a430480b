import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Users, Search, Shield, Trash2, KeyRound, Pencil, FileSpreadsheet, Loader2 } from "lucide-react";
import BulkUserImport from "./BulkUserImport";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const portalRoles = [
  { value: "admin", label: "System Administrator" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
];

const staffRoles = [
  { value: "principal", label: "Principal" },
  { value: "deputy_principal", label: "Deputy Principal" },
  { value: "hod", label: "Head of Department (HOD)" },
  { value: "teacher", label: "Teacher" },
  { value: "senior_teacher", label: "Senior Teacher" },
  { value: "librarian", label: "Librarian" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "sports_director", label: "Sports Director" },
  { value: "bursar", label: "Bursar" },
  { value: "secretary", label: "Secretary" },
  { value: "groundsman", label: "Groundsman" },
  { value: "matron", label: "Matron" },
];

const staffRoleLabels: Record<string, string> = Object.fromEntries(staffRoles.map((r) => [r.value, r.label]));

const departmentOptions = ["Mathematics", "Sciences", "Languages", "Humanities", "Technical", "Arts", "Sports", "Administration"];
const gradeOptions = ["Form 1", "Form 2", "Form 3", "Form 4", "Lower 6", "Upper 6"];

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  portal_role: string;
  staff_role?: string;
  department?: string;
  created_at: string;
}

interface ClassOption {
  id: string;
  name: string;
  form_level: string | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Create user form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    portal_role: "teacher" as string,
    staff_role: "teacher" as string,
    department: "",
    phone: "",
    grade: "",
    class_name: "",
    assigned_class_id: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from("classes").select("id, name, form_level").order("name");
      if (data) setClasses(data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "list-users" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast({ title: "Full name, email and password are required", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "create-user",
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          portal_role: form.portal_role,
          staff_role: form.portal_role === "teacher" || form.portal_role === "admin" ? form.staff_role : undefined,
          department: form.department || undefined,
          phone: form.phone || undefined,
          grade: form.grade || undefined,
          class_name: form.class_name || undefined,
          assigned_class_id: (form.portal_role === "teacher" || form.portal_role === "admin") && form.assigned_class_id ? form.assigned_class_id : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "User created successfully!" });
      setForm({ full_name: "", email: "", password: "", portal_role: "teacher", staff_role: "teacher", department: "", phone: "", grade: "", class_name: "", assigned_class_id: "" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Failed to create user", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt(`Enter new password for ${email}:`);
    if (!newPassword || newPassword.length < 6) {
      if (newPassword) toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "reset-password", user_id: userId, password: newPassword }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "Password reset successfully" });
    } catch (err: any) {
      toast({ title: "Failed to reset password", description: err.message, variant: "destructive" });
    }
  };

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; email: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteUser = (userId: string, email: string) => {
    setDeleteTarget({ userId, email });
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const { userId } = deleteTarget;
    setDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "delete-user", user_id: userId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "User deleted" });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Failed to delete user", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Edit user state
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ portal_role: "", staff_role: "", department: "", full_name: "", assigned_class_id: "" });
  const [saving, setSaving] = useState(false);

  const openEditDialog = async (user: ManagedUser) => {
    setEditUser(user);
    // Find current class assignment for this staff member
    let currentClassId = "";
    if (user.portal_role === "teacher" || user.portal_role === "admin") {
      const { data: staffRecord } = await supabase.from("staff").select("id").eq("user_id", user.id).maybeSingle();
      if (staffRecord) {
        const { data: classRecord } = await supabase.from("classes").select("id").eq("class_teacher_id", staffRecord.id).maybeSingle();
        if (classRecord) currentClassId = classRecord.id;
      }
    }
    setEditForm({
      portal_role: user.portal_role,
      staff_role: user.staff_role || "teacher",
      department: user.department || "",
      full_name: user.full_name,
      assigned_class_id: currentClassId,
    });
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "update-user",
          user_id: editUser.id,
          portal_role: editForm.portal_role,
          staff_role: (editForm.portal_role === "teacher" || editForm.portal_role === "admin") ? editForm.staff_role : undefined,
          department: (editForm.portal_role === "teacher" || editForm.portal_role === "admin") ? editForm.department : undefined,
          full_name: editForm.full_name,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: "User updated successfully" });
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Failed to update user", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch = !searchQuery ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === "all" || u.portal_role === filterRole;
    return matchSearch && matchRole;
  });

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "teacher": return "default" as const;
      case "student": return "secondary" as const;
      case "parent": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  const isStaffRole = form.portal_role === "teacher" || form.portal_role === "admin";

  return (
    <Tabs defaultValue="create" className="space-y-4">
      <TabsList>
        <TabsTrigger value="create"><UserPlus className="mr-1 h-4 w-4" /> Create User</TabsTrigger>
        <TabsTrigger value="bulk"><FileSpreadsheet className="mr-1 h-4 w-4" /> Bulk Import</TabsTrigger>
        <TabsTrigger value="list"><Users className="mr-1 h-4 w-4" /> All Users</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Shield className="h-5 w-5" /> Create New User Account
            </CardTitle>
            <CardDescription>
              Create portal accounts for teachers, administrators, HODs, students, and other staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Mr. T. Sibanda"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="user@giffordhigh.ac.zw"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Portal Access Role *</Label>
                <Select value={form.portal_role} onValueChange={(v) => setForm((p) => ({ ...p, portal_role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {portalRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isStaffRole && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Staff Position / Title</Label>
                  <Select value={form.staff_role} onValueChange={(v) => setForm((p) => ({ ...p, staff_role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staffRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm((p) => ({ ...p, department: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.portal_role === "student" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Form / Grade</Label>
                  <Select value={form.grade} onValueChange={(v) => setForm((p) => ({ ...p, grade: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Select value={form.class_name} onValueChange={(v) => setForm((p) => ({ ...p, class_name: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+263 7X XXX XXXX"
              />
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              {creating ? "Creating Account..." : "Create User Account"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bulk">
        <BulkUserImport onImportComplete={fetchUsers} />
      </TabsContent>

      <TabsContent value="list">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Registered Users</CardTitle>
            <CardDescription>Manage all portal user accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {portalRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {loading ? "Loading users..." : "No users found"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Portal Role</TableHead>
                      <TableHead>Staff Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(u.portal_role)}>
                            {u.portal_role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.staff_role ? (staffRoleLabels[u.staff_role] || u.staff_role.replace(/_/g, " ")) : "—"}
                        </TableCell>
                        <TableCell>{u.department || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit user"
                              onClick={() => openEditDialog(u)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reset password"
                              onClick={() => handleResetPassword(u.id, u.email)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete user"
                              onClick={() => confirmDeleteUser(u.id, u.email)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update role and position for {editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Portal Access Role</Label>
              <Select value={editForm.portal_role} onValueChange={(v) => setEditForm((p) => ({ ...p, portal_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {portalRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(editForm.portal_role === "teacher" || editForm.portal_role === "admin") && (
              <>
                <div className="space-y-2">
                  <Label>Staff Position / Title</Label>
                  <Select value={editForm.staff_role} onValueChange={(v) => setEditForm((p) => ({ ...p, staff_role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staffRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={editForm.department || "none"} onValueChange={(v) => setEditForm((p) => ({ ...p, department: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account for <strong>{deleteTarget?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
