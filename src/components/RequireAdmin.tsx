import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router";

/** Route guard for admin-only pages. Renders the child once the signed-in
 *  user is confirmed to have the `admin` role, otherwise bounces to /dashboard. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
