import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function rolesQueryOptions(userId) {
  return queryOptions({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
    staleTime: 5 * 60_000,
  });
}
