import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

interface RequireAdminProps {
  children: ReactNode;
}

function RequireAdmin({ children }: RequireAdminProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RequireAdmin;
