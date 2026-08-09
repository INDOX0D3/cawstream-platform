import { PageHeader } from "@/components/layout/Shell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { formatDateTime } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SmtpForm {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  senderName: string;
  senderEmail: string;
  passwordConfigured: boolean;
}

export default function AdminSmtp() {
  const settings = useQuery(api.settings.getAdminSettings);
  const updateSettings = useMutation(api.settings.updateSettings);
  const sendTestEmail = useMutation(api.mailer.sendTestEmail);
  const sentEmails = useQuery(api.mailer.listSentEmails);

  const [form, setForm] = useState<SmtpForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings && form === null) {
      setForm({
        enabled: settings.smtp.enabled,
        host: settings.smtp.host,
        port: settings.smtp.port,
        username: settings.smtp.username,
        password: "",
        encryption: settings.smtp.encryption,
        senderName: settings.smtp.senderName,
        senderEmail: settings.smtp.senderEmail,
        passwordConfigured: settings.smtp.passwordConfigured,
      });
    }
  }, [settings, form]);

  if (!form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = <K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ section: "smtp", value: form });
      toast.success("SMTP settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save SMTP settings");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) {
      toast.error("Enter a recipient address first.");
      return;
    }
    setTesting(true);
    try {
      const result = await sendTestEmail({ to: testTo });
      if (result.delivered) {
        toast.success("Test email sent successfully");
      } else {
        toast.info(result.message ?? "Test email recorded in the mail log");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMTP & email"
        description="Outbound mail configuration. Credentials stay server-side — only administrators see this."
      />

      <div className="mx-auto max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-muted-foreground" />
              SMTP relay
            </CardTitle>
            <CardDescription>
              Set the sender and relay details. The password is stored encrypted
              server-side and never shown again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Enable SMTP</p>
                <p className="text-xs text-muted-foreground">
                  Used for verification emails and password resets.
                </p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                  value={form.host}
                  onChange={(e) => set("host", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={form.port}
                  onChange={(e) => set("port", Number(e.target.value) || 587)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={form.passwordConfigured ? "•••••••• (unchanged)" : "Enter password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Encryption</Label>
              <Select value={form.encryption} onValueChange={(v) => set("encryption", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">STARTTLS (587)</SelectItem>
                  <SelectItem value="ssl">SSL/TLS (465)</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-sender">Sender name</Label>
                <Input
                  id="smtp-sender"
                  value={form.senderName}
                  onChange={(e) => set("senderName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-sender-email">Sender email</Label>
                <Input
                  id="smtp-sender-email"
                  type="email"
                  placeholder="no-reply@yourdomain.com"
                  value={form.senderEmail}
                  onChange={(e) => set("senderEmail", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save SMTP settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send test email</CardTitle>
            <CardDescription>
              Verifies delivery through the configured provider. Without an
              email provider the message is recorded in the mail log instead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <Button onClick={sendTest} disabled={testing}>
                {testing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mail log</CardTitle>
          <CardDescription>Recent outbound mail attempts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sentEmails === undefined ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : sentEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No mail has been sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                sentEmails.map((mail) => (
                  <TableRow key={mail._id}>
                    <TableCell className="text-sm">{mail.to}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm">{mail.subject}</TableCell>
                    <TableCell>
                      <StatusBadge status={mail.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(mail.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
