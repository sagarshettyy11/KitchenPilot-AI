import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";
import { visibleModules, primaryRoleLabel } from "@/lib/roles";

export function AppSidebar({ roles }) {
  const { pathname } = useLocation();
  const nav = visibleModules(roles);
  const roleLabel = primaryRoleLabel(roles);
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border/60 px-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                    item.badge === "AI"
                      ? "bg-accent-teal/15 text-accent-teal"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Signed in as
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{roleLabel}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {nav.length} modules available
          </div>
        </div>
      </div>
    </aside>
  );
}
