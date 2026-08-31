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
      setUser(data.user ?? null);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // 1. Roles Query (Declared unconditionally at top level)
  const rolesQuery = useQuery({
    ...rolesQueryOptions(user?.id ?? ""),
    enabled: !!user?.id,
  });

  // 2. Active Restaurant Query (Declared unconditionally at top level)
  const restaurantQuery = useQuery({
    queryKey: ["active-restaurant-provisioning", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user selected a specific hotel via Admin "Launch"
      const override = localStorage.getItem("kitchenpilot_selected_hotel");
      if (override) {
        try {
          const parsed = JSON.parse(override);
          if (parsed?.id) {
            const { data } = await supabase
              .from("restaurants")
              .select("id, name, enabled_modules, status, plan_tier")
              .eq("id", parsed.id)
              .maybeSingle();
            if (data) return data;
          }
        } catch (e) {
          console.warn("Invalid hotel override in localStorage:", e);
        }
      }

      // Query primary restaurant
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, enabled_modules, status, plan_tier")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching restaurant provisioning:", error.message);
        // Fallback to first available restaurant if any
        const { data: anyRest } = await supabase
          .from("restaurants")
          .select("id, name, enabled_modules, status, plan_tier")
          .limit(1)
          .maybeSingle();
        return anyRest || null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Early returns AFTER all hooks have been declared
  if (authLoading || (user && rolesQuery.isLoading)) {
    return <ShellSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const roles = rolesQuery.data ?? ["owner"];
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
