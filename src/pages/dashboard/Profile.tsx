import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { AtSign, CheckCircle2, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Profile() {
  const { user } = useAuth();
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username ?? "");
    }
  }, [user]);

  const usernameValid = useMemo(
    () => /^[a-zA-Z0-9_]{3,24}$/.test(username),
    [username],
  );
  const checkUsername =
    usernameValid && username !== user?.username ? username : null;
  const taken = useQuery(
    api.users.isUsernameTaken,
    checkUsername ? { username: checkUsername } : "skip",
  );
  const usernameTaken = taken === true;

  const save = async () => {
    if (!usernameValid) {
      toast.error("Usernames must be 3–24 characters using letters, numbers or underscores.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name, username });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-lg font-semibold text-background">
              {initials(user?.name ?? "U")}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {user?.name ?? "Account"}
                <StatusBadge status={user?.status ?? "active"} kind="account" />
              </CardTitle>
              <CardDescription>{user?.email ?? "No email on this account"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  className={cn("pl-9", usernameTaken && "border-destructive")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              {usernameTaken && (
                <p className="text-xs text-destructive">That username is already taken.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || usernameTaken}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" /> Email
            </span>
            <span className="flex items-center gap-2">
              {user?.email ?? "—"}
              {user?.emailVerified ? (
                <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="size-4" /> Role
            </span>
            <Badge variant="secondary" className="capitalize">
              {user?.role === "admin" ? "Administrator" : "Member"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-4" /> Member since
            </span>
            <span>
              {user?._creationTime
                ? new Date(user._creationTime).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
