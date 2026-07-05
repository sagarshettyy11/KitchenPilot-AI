import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/roles";

export function ModuleStub({ module }) {
  const Icon = module.icon;
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-border/60 bg-card p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{module.label}</h1>
                {module.badge && (
                  <span
                    className={
                      module.badge === "AI"
                        ? "rounded-md bg-accent-teal/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-teal"
                        : "rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                    }
                  >
                    {module.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                This module is part of an upcoming KitchenPilot phase. You have access based on your
                role.
              </p>
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Allowed roles
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {module.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {ROLE_LABELS[r]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
