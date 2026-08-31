import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Clock, Building2, User, Loader2, ShieldCheck, Activity } from "lucide-react";

export function AdminAuditPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data ?? [];
    },
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ScrollText className="h-7 w-7 text-indigo-400" />
          Admin Activity & Provisioning Audit Trail
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Historical log of SuperAdmin actions, hotel creations, tier modifications, and feature module toggles.
        </p>
      </div>

      <Card className="bg-slate-900/70 border-slate-800/80 rounded-3xl backdrop-blur-xl text-slate-100 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/60">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Admin Email</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Hotel</th>
                  <th className="px-6 py-4">Change Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading audit events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                          {log.admin_email || "SuperAdmin"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`text-[11px] font-mono ${
                            log.action?.includes("DELETE")
                              ? "bg-rose-950 text-rose-300 border-rose-800"
                              : log.action?.includes("CREATE")
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                              : "bg-indigo-950 text-indigo-300 border-indigo-800"
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-white">
                        {log.target_name || log.target_id || "Global"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
