import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AccountSettings } from "./pages/AccountSettings";
import { Analytics } from "./pages/Analytics";
import { AuditLog } from "./pages/AuditLog";
import { Dashboard } from "./pages/Dashboard";
import { Help } from "./pages/Help";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { Login } from "./pages/Login";
import { Settings } from "./pages/Settings";
import { Users } from "./pages/Users";
import { Vendors } from "./pages/Vendors";
import { VendorDetail } from "./pages/VendorDetail";

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/help" element={<Help />} />
        <Route path="/account" element={<AccountSettings />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin/vendors" element={<Vendors />} />
        <Route path="/admin/vendors/:id" element={<VendorDetail />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/audit-log" element={<AuditLog />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
