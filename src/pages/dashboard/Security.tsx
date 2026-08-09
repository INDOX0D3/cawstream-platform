import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Security() {
  const { user } = useAuth();
  const changePassword = useMutation(api.users.changePassword);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const validLength = next.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) {
      toast.error("Enter your current password.");
      return;
    }
    if (!validLength) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed — other devices were signed out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-muted-foreground" />
            Change password
          </CardTitle>
          <CardDescription>
            Changing your password signs out every other device while keeping
            this one signed in. Passwords are stored as Scrypt hashes — never in
            plaintext.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-12 text-emerald-500" />
              <p className="text-sm font-semibold">Password updated</p>
              <p className="text-xs text-muted-foreground">
                Use your new password next time you sign in from another device.
              </p>
              <Button variant="outline" size="sm" onClick={() => setDone(false)}>
                Change it again
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current password</Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={show ? "text" : "password"}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    aria-label={show ? "Hide passwords" : "Show passwords"}
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next">New password</Label>
                <Input
                  id="next"
                  type={show ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. {!validLength && next.length > 0 && "Too short."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                {confirm.length > 0 && confirm !== next && (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Update password
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Account security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            Email verification is required before your dashboard can be used
            ({user?.emailVerified ? "verified" : "pending"}).
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            Failed sign-in attempts are rate limited and verification codes
            expire within minutes.
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            Sessions are short-lived JWT + refresh token pairs scoped to this
            deployment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
