import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { LandingPage } from "@/pages/LandingPage";
import { AuthPage } from "@/pages/AuthPage";
import { AuthenticatedLayout } from "@/layouts/AuthenticatedLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { ModuleStubPage } from "@/pages/ModuleStubPage";
import { TablesPage } from "@/pages/TablesPage";
import { MenuPage } from "@/pages/MenuPage";
import { SettingsPage } from "@/pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Authenticated Routes */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Module Stubs */}
            <Route path="/pos" element={<ModuleStubPage moduleId="pos" />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/kitchen" element={<ModuleStubPage moduleId="kitchen" />} />
            <Route path="/inventory" element={<ModuleStubPage moduleId="inventory" />} />
            <Route path="/customers" element={<ModuleStubPage moduleId="customers" />} />
            <Route path="/finance" element={<ModuleStubPage moduleId="finance" />} />
            <Route path="/reports" element={<ModuleStubPage moduleId="reports" />} />
            <Route path="/ai" element={<ModuleStubPage moduleId="ai" />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
