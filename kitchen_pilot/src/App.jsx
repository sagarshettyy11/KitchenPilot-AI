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
import { ReportsPage } from "@/pages/ReportsPage";
import { POSPage } from "@/pages/POSPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { FinancePage } from "@/pages/FinancePage";
import { KitchenPage } from "@/pages/KitchenPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { TablesPage } from "@/pages/TablesPage";
import { MenuPage } from "@/pages/MenuPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Admin Portal Imports
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminHotelsPage } from "@/pages/admin/AdminHotelsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";

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
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* SuperAdmin Executive Console */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="hotels" element={<AdminHotelsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Authenticated Restaurant Tenant Routes */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Module Stubs */}
            <Route path="/pos" element={<POSPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
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
