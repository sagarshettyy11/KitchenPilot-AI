import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function rolesQueryOptions(userId) {
  return queryOptions({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (error) {
          console.warn("user_roles fetch warning:", error.message);
          return ["owner"];
        }
        const roles = (data ?? []).map((r) => r.role);
        return roles.length > 0 ? roles : ["owner"];
      } catch (err) {
        console.warn("user_roles error fallback:", err);
        return ["owner"];
      }
    },
    staleTime: 5 * 60_000,
  });
}
