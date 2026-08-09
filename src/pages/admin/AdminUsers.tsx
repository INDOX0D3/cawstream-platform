import { PageHeader } from "@/components/layout/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { api } from "@/convex/_generated/api";
import { formatBytes, formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Ban, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserRow = NonNullable<ReturnType<typeof useQuery<typeof api.admin.listUsers>>>[number];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminUsers() {
  const users = useQuery(api.admin.listUsers);
  const setUserStatus = useMutation(api.admin.setUserStatus);
  const deleteUser = useMutation(api.admin.deleteUser);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
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
