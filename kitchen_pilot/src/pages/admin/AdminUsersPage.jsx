import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  ShieldCheck,
  Building2,
  Mail,
  UserCheck,
  Loader2,
  KeyRound,
  Trash2,
  UserPlus,
  Edit2,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_ROLES = [
  { id: "super_admin", label: "Super Admin (Global Root)" },
  { id: "owner", label: "Hotel Owner" },
  { id: "manager", label: "General Manager" },
  { id: "cashier", label: "Cashier / Billing Staff" },
  { id: "kitchen", label: "Kitchen Chef / KDS" },
  { id: "inventory", label: "Inventory Manager" },
  { id: "waiter", label: "Captain / Waiter" },
  { id: "accountant", label: "Accountant" },
  { id: "delivery", label: "Delivery Dispatch" },
];

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState("manager");
  const [editHotelId, setEditHotelId] = useState("all");

  // Fetch hotels for dropdown
  const { data: hotels = [] } = useQuery({
    queryKey: ["admin-hotels-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("id, name");
      if (error) return [];
      return data ?? [];
    },
  });

  // Fetch users & profiles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pError) throw pError;

      const { data: roles, error: rError } = await supabase
        .from("user_roles")
        .select("*");
      if (rError) throw rError;

      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, name");

      const restMap = (restaurants || []).reduce((acc, r) => {
        acc[r.id] = r.name;
        return acc;
      }, {});

      return (profiles || []).map((p) => {
        const userRoles = (roles || []).filter((r) => r.user_id === p.id);
        return {
          ...p,
          roles: userRoles.map((r) => ({
            id: r.id,
            role: r.role,
            restaurant_id: r.restaurant_id,
            restaurant_name: r.restaurant_id ? restMap[r.restaurant_id] : "All / Global",
          })),
        };
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
          queryClient.invalidateQueries({ queryKey: ["admin-all-user-roles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, restaurantId }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Upsert role
      const { error } = await supabase
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            role: role,
            restaurant_id: restaurantId === "all" ? null : restaurantId,
          },
          { onConflict: "user_id, role" }
        );

      if (error) throw error;

      // Log audit
      await supabase.from("admin_audit_logs").insert({
        admin_id: currentUser?.id,
        admin_email: currentUser?.email,
        action: "ASSIGN_ROLE",
        target_type: "user",
        target_id: userId,
        target_name: selectedUser?.email,
        details: { new_role: role, restaurant_id: restaurantId },
      });
    },
    onSuccess: () => {
      toast.success("User role updated successfully!");
      setRoleModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    },
  });

  function openEditUser(user) {
    setSelectedUser(user);
    const firstRole = user.roles[0];
    setEditRole(firstRole?.role || "manager");
    setEditHotelId(firstRole?.restaurant_id || "all");
    setRoleModalOpen(true);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-400" />
            Platform Users & Role Permissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Directory of registered accounts, SuperAdmins, hotel owners, and staff members across all properties.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by user email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-slate-800 bg-slate-950/70 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-4">User Identity</th>
                  <th className="px-6 py-4">Assigned Roles</th>
                  <th className="px-6 py-4">Associated Property</th>
                  <th className="px-6 py-4">Joined At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading live user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuper = u.roles.some((r) => r.role === "super_admin") || u.email === "admin@kitchenpilot.in";
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0 shadow-md">
                              {u.full_name?.substring(0, 2).toUpperCase() || u.email?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{u.full_name || "User"}</span>
                                {isSuper && (
                                  <Badge className="bg-indigo-950 text-indigo-300 border-indigo-700/60 text-[10px]">
                                    SuperAdmin
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No assigned role</span>
                            ) : (
                              u.roles.map((r, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="capitalize text-[11px] bg-slate-800 border-slate-700 text-slate-300"
                                >
                                  {r.role}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-300">
                          {u.roles.map((r) => r.restaurant_name).join(", ") || "Global Platform"}
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Recent"}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => openEditUser(u)}
                            className="h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold gap-1"
                          >
                            <Edit2 className="h-3 w-3 text-indigo-400" /> Edit Role
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      {selectedUser && (
        <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-400" />
                Edit Roles & Permissions
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Assign platform privileges or hotel management scope to <strong className="text-white">{selectedUser.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Platform Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {AVAILABLE_ROLES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Assigned Hotel Scope</Label>
                <Select value={editHotelId} onValueChange={setEditHotelId}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-900 border-slate-800 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="all">Global / All Properties</SelectItem>
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-800 pt-4">
              <Button
                variant="outline"
                onClick={() => setRoleModalOpen(false)}
                className="border-slate-800 text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: editRole,
                    restaurantId: editHotelId,
                  })
                }
                disabled={updateRoleMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
              >
                {updateRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
