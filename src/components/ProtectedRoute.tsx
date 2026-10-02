import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PixelSpinner } from "./ui/Button";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, role, profile, approvalStatus, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="crt-grid crt-scanlines flex min-h-screen flex-col items-center justify-center bg-bg-canvas text-accent-cyan">
        <div className="border border-accent-cyan/30 bg-bg-base/80 p-6 font-mono text-center shadow-[0_0_20px_rgba(56,225,255,0.15)]">
          <div className="mb-3 flex justify-center">
            <PixelSpinner />
          </div>
          <p className="text-xs uppercase tracking-widest text-text-secondary">
            VERIFYING OPERATOR CREDENTIALS...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile || (role !== "admin" && approvalStatus !== "approved")) {
    return <Navigate to="/login" state={{ approvalStatus: profile ? approvalStatus : "unavailable" }} replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
