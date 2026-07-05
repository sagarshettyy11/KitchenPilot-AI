import { useEffect } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { hasAnyRole, MODULES } from "@/lib/roles";
import { ModuleStub } from "@/components/dashboard/ModuleStub";

export function ModuleStubPage({ moduleId }) {
  const { roles } = useOutletContext();
  const mod = MODULES.find((m) => m.id === moduleId);

  useEffect(() => {
    if (mod) {
      document.title = `${mod.label} · KitchenPilot`;
    }
  }, [mod]);

  if (!mod) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasAnyRole(roles, mod.roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <ModuleStub module={mod} />;
}
