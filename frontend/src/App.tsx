import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Help } from "./pages/Help";
import { InvoiceDetail } from "./pages/InvoiceDetail";
import { Login } from "./pages/Login";

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
      </Route>
      <Route element={<AdminLayout />}>

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
