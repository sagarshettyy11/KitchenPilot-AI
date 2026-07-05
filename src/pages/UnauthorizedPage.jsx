import { Link, useOutletContext } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { primaryRoleLabel } from "@/lib/roles";
import { useEffect } from "react";

export function UnauthorizedPage() {
  const { roles } = useOutletContext();

  useEffect(() => {
    document.title = "Access denied · KitchenPilot";
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as{" "}
          <span className="font-semibold text-foreground">{primaryRoleLabel(roles)}</span>, which
          doesn't include this module. Ask an owner or manager to grant additional roles.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
