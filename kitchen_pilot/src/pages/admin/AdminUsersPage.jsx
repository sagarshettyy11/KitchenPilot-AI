import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch users & profiles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*");
      if (pError) throw pError;

      const { data: roles, error: rError } = await supabase
        .from("user_roles")
        .select("*");
      if (rError) throw rError;

      const { data: restaurants, error: restError } = await supabase
        .from("restaurants")
        .select("id, name");
      if (restError) throw restError;

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
            restaurant_name: r.restaurant_id ? restMap[r.restaurant_id] : "All / Global",
          })),
        };
      });
    },
  });

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="h-7 w-7 text-indigo-400" />
          Platform Users & Role Permissions
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Directory of registered accounts, SuperAdmins, hotel owners, and staff members across all properties.
        </p>
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
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Assigned Roles</th>
                  <th className="px-6 py-4">Associated Property</th>
                  <th className="px-6 py-4">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
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
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
