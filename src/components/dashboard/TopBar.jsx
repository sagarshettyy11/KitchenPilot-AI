import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { primaryRoleLabel } from "@/lib/roles";

export function TopBar({ email, roles = [] }) {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  }
  const initial = (email ?? "U").charAt(0).toUpperCase();
  const roleLabel = primaryRoleLabel(roles);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur md:px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search orders, items, customers…"
          className="h-10 w-full rounded-xl border border-border/60 bg-card pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <Button variant="ghost" size="icon" className="rounded-xl">
        <Bell className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-2 py-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground">
          {initial}
        </div>
        <div className="hidden text-xs md:block">
          <div className="font-medium text-foreground">{email ?? "Owner"}</div>
          <div className="text-muted-foreground">{roleLabel}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="rounded-lg text-xs">
          Sign out
        </Button>
      </div>
    </header>
  );
}
