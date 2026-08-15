import { PageHeader } from "@/components/layout/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { formatBytes, formatDate } from "@/lib/format";
import type { AdminUser, PlanId } from "@/lib/types";
import { Ban, CheckCircle2, Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserRow = AdminUser;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const users = useApiQuery<AdminUser[]>("admin/listUsers");
  const setUserStatus = useApiMutation("admin/setUserStatus");
  const setUserRole = useApiMutation("admin/setUserRole");
  const setUserPlan = useApiMutation("admin/setUserPlan");
  const deleteUser = useApiMutation("admin/deleteUser");
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);

  const toggleStatus = async (user: UserRow) => {
    setBusyId(user._id);
    try {
      await setUserStatus({
        userId: user._id,
        status: user.status === "suspended" ? "active" : "suspended",
      });
      toast.success(user.status === "suspended" ? "Account activated" : "Account suspended");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update account");
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = async (user: UserRow) => {
    const promote = user.role !== "admin";
    setBusyRoleId(user._id);
    try {
      await setUserRole({ userId: user._id, role: promote ? "admin" : "user" });
      toast.success(promote ? "Promoted to administrator" : "Admin access removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setBusyRoleId(null);
    }
  };

  const changePlan = async (user: UserRow, plan: PlanId) => {
    if (plan === (user.plan ?? "free")) return;
    setBusyPlanId(user._id);
    try {
      await setUserPlan({ userId: user._id, plan });
      toast.success(`Plan for ${user.name} set to ${plan}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update plan");
    } finally {
      setBusyPlanId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting._id);
    try {
      await deleteUser({ userId: deleting._id });
      toast.success("User and all their videos deleted");
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user");
    } finally {
      setBusyId(null);
    }
  };

  if (users === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts, roles and account status."
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Videos</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: UserRow) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.name}
                          {user.isAnonymous && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(guest)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{user.username} · {user.email ?? "no email"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.plan ?? "free"}
                      onValueChange={(v) => void changePlan(user, v as PlanId)}
                      disabled={busyPlanId === user._id}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        {busyPlanId === user._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="platinum">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} kind="account" />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{user.videoCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {user.totalViews.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBytes(user.storageBytes)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(user._creationTime)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyRoleId === user._id || user._id === me?._id}
                        onClick={() => void toggleRole(user)}
                        className={
                          user.role === "admin"
                            ? "text-amber-600 hover:text-amber-600"
                            : "text-emerald-600 hover:text-emerald-600"
                        }
                        title={
                          user._id === me?._id
                            ? "You cannot change your own role"
                            : user.role === "admin"
                              ? "Remove admin access"
                              : "Promote to admin"
                        }
                      >
                        {busyRoleId === user._id ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : user.role === "admin" ? (
                          <ShieldOff className="mr-1.5 size-3.5" />
                        ) : (
                          <ShieldCheck className="mr-1.5 size-3.5" />
                        )}
                        {user.role === "admin" ? "Revoke" : "Make admin"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === user._id}
                        onClick={() => void toggleStatus(user)}
                        className={
                          user.status === "suspended"
                            ? "text-emerald-600 hover:text-emerald-600"
                            : "text-amber-600 hover:text-amber-600"
                        }
                      >
                        {busyId === user._id ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : user.status === "suspended" ? (
                          <CheckCircle2 className="mr-1.5 size-3.5" />
                        ) : (
                          <Ban className="mr-1.5 size-3.5" />
                        )}
                        {user.status === "suspended" ? "Activate" : "Suspend"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={busyId === user._id}
                        onClick={() => setDeleting(user)}
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account, all of their videos, files,
              thumbnails, views and settings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
