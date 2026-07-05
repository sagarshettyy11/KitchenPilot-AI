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

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar roles={roles} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar email={user?.email} roles={roles} />
        <main className="flex-1 flex flex-col min-h-0">
          <Outlet context={{ user, roles }} />
        </main>
      </div>
    </div>
  );
}
