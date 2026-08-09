import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { Loader2, ShieldAlert, ShieldCheck, UserRoundX } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";

/** Route guard for admin-only pages. Renders the child once the signed-in
 *  user is confirmed to have the `admin` role.
 *
 *  Non-admins get a clear "access denied" screen instead of a silent bounce.
 *  If this installation has no administrator at all (first account whose
 *  bootstrap never ran), the verified user is offered a "Claim administrator
 *  access" button — the safe equivalent of the installer's create-admin step.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const adminStatus = useQuery(api.users.adminStatus);
  const bootstrapAdmin = useMutation(api.users.bootstrapAdmin);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user?.role === "admin") {
    return children;
  }

  const canClaim =
    adminStatus !== undefined && !adminStatus.hasAdmin && user?.emailVerified === true;

  const claim = async () => {
    try {
      await bootstrapAdmin();
      toast.success("You are now an administrator.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim admin access.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <ShieldAlert className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin access required</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Your account ({user?.email ?? "no email"}) has the role{" "}
          <span className="font-medium text-foreground">member</span>. Only
          administrators can open this panel.
        </p>
      </div>

      {canClaim ? (
        <div className="w-full max-w-md rounded-xl border bg-muted/30 p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-emerald-600" />
            This installation has no administrator yet
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Your account was the first one, but its admin bootstrap never ran.
            You can claim administrator access now — this only works while no
            administrator exists.
          </p>
          <Button className="mt-3 w-full" onClick={() => void claim()}>
            Claim administrator access
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRoundX className="size-4" />
          Ask an existing administrator to promote your account.
        </p>
      )}

      <Link to="/dashboard">
        <Button variant="outline">Back to dashboard</Button>
      </Link>
    </main>
  );
}
