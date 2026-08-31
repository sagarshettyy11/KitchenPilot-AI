import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ShellSkeleton } from "@/components/dashboard/ShellSkeleton";
import { rolesQueryOptions } from "@/lib/roles-query";

export function AuthenticatedLayout() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const rolesQuery = useQuery({
    ...rolesQueryOptions(user?.id ?? ""),
    enabled: !!user?.id,
  });

  if (authLoading || (user && rolesQuery.isLoading)) {
    return <ShellSkeleton />;
  }

  if (!user) {
    // Redirect to login page and keep the current URL in location state
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const roles = rolesQuery.data ?? [];

  // Query primary restaurant to get enabled_modules
  const restaurantQuery = useQuery({
    queryKey: ["active-restaurant-provisioning", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, enabled_modules, status, plan_tier")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const enabledModules = restaurantQuery.data?.enabled_modules;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar roles={roles} enabledModules={enabledModules} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={user?.email} roles={roles} />
        <main className="flex-1 flex flex-col min-h-0">
          <Outlet context={{ user, roles, restaurant: restaurantQuery.data }} />
        </main>
      </div>
    </div>
  );
}
