import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { userRole, loading, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (userRole !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
