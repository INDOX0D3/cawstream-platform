import { CawMark, Logo } from "@/components/brand";
import { PricingCards } from "@/components/Pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

type Step =
  | { mode: "signIn" }
  | { mode: "plans" }
  | { mode: "signUp" }
  | {
      mode: "verify";
      email: string;
      password: string;
      isNewUser: boolean;
      username?: string;
    }
  | { mode: "forgot" }
  | { mode: "reset"; email: string };

const BULLETS = [
  { icon: Zap, title: "auth.bullet1Title", text: "auth.bullet1Text" },
  { icon: ShieldCheck, title: "auth.bullet2Title", text: "auth.bullet2Text" },
  { icon: RefreshCw, title: "auth.bullet3Title", text: "auth.bullet3Text" },
] as const;

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const { t } = useI18n();
  const convex = useConvex();
  const completeSignup = useMutation(api.users.completeSignup);
  const siteConfig = useQuery(api.settings.getPublicConfig);
  const siteName = siteConfig?.site.name || "CawStream";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);

  const [step, setStep] = useState<Step>({ mode: "signIn" });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestSignIn, setSuggestSignIn] = useState(false);
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !didNavigate.current) {
      didNavigate.current = true;
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const fail = (err: unknown, fallback: string) => {
    const message = err instanceof Error && err.message ? err.message : fallback;
    setError(message);
    setIsLoading(false);
  };

  // ---------------------------------------------------------------- sign in
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const result = await signIn("password", { flow: "signIn", email, password });
      if (!result.signingIn) {
        setStep({ mode: "verify", email, password, isNewUser: false });
        setOtp("");
      }
      setIsLoading(false);
    } catch (err) {
      fail(err, "Sign-in failed. Check your email and password.");
    }
  };

  // ---------------------------------------------------------------- sign up
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuggestSignIn(false);
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      setError("Usernames must be 3–24 characters using letters, numbers or underscores.");
      setIsLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    // Convex Auth does not reject a signUp with an existing email — it just
    // re-sends a verification code for the old account. Check first and tell
    // the user their email is already registered, suggesting to sign in.
    try {
      const registered = await convex.query(api.users.isEmailRegistered, { email });
      if (registered) {
        setSuggestSignIn(true);
        setError(t("auth.alreadyExists"));
        setIsLoading(false);
        return;
      }
    } catch {
      // Check failed — let the auth flow decide (it may error on its own).
    }

    try {
      await signIn("password", {
        flow: "signUp",
        email,
        password,
        username,
        name: name || username,
      });
      setStep({ mode: "verify", email, password, isNewUser: true, username });
      setOtp("");
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/already/i.test(message)) {
        setSuggestSignIn(true);
        setError(t("auth.alreadyExists"));
      } else {
        fail(err, "Could not create your account.");
      }
    }
  };

  // --------------------------------------------------------- verify (OTP)
  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step.mode !== "verify") return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("password", {
        flow: "email-verification",
        email: step.email,
        code: otp,
      });
      if (result.signingIn) {
        if (step.isNewUser && step.username) {
          try {
            await completeSignup({ username: step.username });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Could not finalize your username.",
            );
          }
        }
        setIsLoading(false);
        // navigation happens via the authenticated effect
      } else {
        setError("That code is invalid or has expired.");
        setOtp("");
        setIsLoading(false);
      }
    } catch (err) {
      fail(err, "That code is invalid or has expired.");
      setOtp("");
    }
  };

  const resendVerify = async () => {
    if (step.mode !== "verify") return;
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", { flow: "signIn", email: step.email, password: step.password });
      toast.success(t("auth.newCode"));
    } catch (err) {
      fail(err, "Could not resend the code.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------- forgot / reset
  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    try {
      const result = await signIn("password", { flow: "reset", email });
      void result;
      setStep({ mode: "reset", email });
      setOtp("");
      setIsLoading(false);
    } catch (err) {
      // Never confirm whether an email exists — same message either way.
      setError("If that email exists, a reset code has been sent.");
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step.mode !== "reset") return;
    setIsLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsLoading(false);
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }
    try {
      const result = await signIn("password", {
        flow: "reset-verification",
        email: step.email,
        code: otp,
        newPassword,
      });
      if (!result.signingIn) {
        setError("That code is invalid or has expired.");
        setOtp("");
        setIsLoading(false);
      } else {
        toast.success(t("auth.verifiedSignedIn"));
        setIsLoading(false);
        // navigation happens via the authenticated effect
      }
    } catch (err) {
      fail(err, "That code is invalid or has expired.");
      setOtp("");
    }
  };

  const resendReset = async () => {
    if (step.mode !== "reset") return;
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email: step.email });
      toast.success(t("auth.newCode"));
    } catch {
      setError("Could not resend the code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center">
        {/* Brand panel (desktop) */}
        <div className="hidden max-w-sm flex-col gap-6 lg:flex">
          <Logo className="text-foreground" />
          <div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              {t("auth.heading")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("auth.subheading")}
            </p>
          </div>
          <div className="space-y-4">
            {BULLETS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{t(title)}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{t(text)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <Card
          className={cn(
            "w-full border shadow-lg shadow-black/5",
            step.mode === "plans" ? "max-w-2xl" : "max-w-md",
          )}
        >
          {step.mode === "plans" ? (
            <>
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <CawMark className="size-10 rounded-xl bg-foreground p-2 text-background" />
                </div>
                <CardTitle className="text-xl">{t("auth.choosePlan")}</CardTitle>
                <CardDescription>{t("auth.choosePlanDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <PricingCards
                  onFree={() => {
                    setStep({ mode: "signUp" });
                    setError(null);
                  }}
                  compact
                />
              </CardContent>
              <CardFooter className="flex-col gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("auth.haveAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStep({ mode: "signIn" });
                      setError(null);
                    }}
                    className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-brand"
                  >
                    {t("auth.signIn")}
                  </button>
                </p>
              </CardFooter>
            </>
          ) : step.mode === "signIn" || step.mode === "signUp" ? (
            <>
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <CawMark className="size-10 rounded-xl bg-foreground p-2 text-background" />
                </div>
                <CardTitle className="text-xl">
                  {step.mode === "signIn" ? t("auth.welcomeBack") : t("auth.createAccount")}
                </CardTitle>
                <CardDescription>
                  {step.mode === "signIn" ? t("auth.signInDesc") : t("auth.signUpDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={step.mode === "signIn" ? handleSignIn : handleSignUp}
                  className="space-y-4"
                >
                  {step.mode === "signUp" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setStep({ mode: "plans" })}
                        className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <ArrowLeft className="size-3.5 shrink-0" />
                        <span className="truncate">{t("auth.planNoteShort")}</span>
                        <span className="ml-auto font-medium text-brand">Plans</span>
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="username">{t("auth.username")}</Label>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="username"
                              name="username"
                              className="pl-9"
                              placeholder="creator"
                              autoComplete="username"
                              required
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">{t("auth.displayName")}</Label>
                          <div className="relative">
                            <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="name"
                              name="name"
                              className="pl-9"
                              placeholder="Your name"
                              autoComplete="name"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        className="pl-9"
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      {step.mode === "signIn" && (
                        <button
                          type="button"
                          onClick={() => {
                            setStep({ mode: "forgot" });
                            setError(null);
                          }}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t("auth.forgot")}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10"
                        placeholder={step.mode === "signUp" ? "At least 8 characters" : "Your password"}
                        autoComplete={step.mode === "signUp" ? "new-password" : "current-password"}
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  {step.mode === "signUp" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
                      <Input
                        id="confirm"
                        name="confirm"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <p className="text-sm text-destructive">{error}</p>
                      {suggestSignIn && (
                        <button
                          type="button"
                          onClick={() => {
                            setSuggestSignIn(false);
                            setError(null);
                            setStep({ mode: "signIn" });
                          }}
                          className="mt-1 text-xs font-semibold text-destructive underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                          {t("auth.signInInstead")}
                        </button>
                      )}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {step.mode === "signIn" ? t("auth.signingIn") : t("auth.creating")}
                      </>
                    ) : (
                      <>
                        {step.mode === "signIn" ? t("auth.signIn") : t("auth.create")}
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {step.mode === "signIn"
                    ? t("auth.newHere", { site: siteName })
                    : t("auth.haveAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStep(step.mode === "signIn" ? { mode: "plans" } : { mode: "signIn" });
                      setError(null);
                    }}
                    className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-brand"
                  >
                    {step.mode === "signIn" ? t("auth.createOne") : t("auth.signIn")}
                  </button>
                </p>
              </CardFooter>
            </>
          ) : step.mode === "verify" ? (
            <>
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <Mail className="size-9 text-brand" />
                </div>
                <CardTitle className="text-xl">{t("auth.checkEmail")}</CardTitle>
                <CardDescription>
                  {t("auth.checkEmailDesc", { email: step.email })}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleVerify}>
                <CardContent className="pb-4">
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          (e.target as HTMLElement).closest("form")?.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : t("auth.verifyEmail")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={resendVerify}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    {t("auth.resendCode")}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-muted-foreground"
                    onClick={() => {
                      setStep({ mode: "signIn" });
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    {t("auth.differentEmail")}
                  </Button>
                </CardFooter>
              </form>
            </>
          ) : step.mode === "forgot" ? (
            <>
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <Lock className="size-9 text-brand" />
                </div>
                <CardTitle className="text-xl">{t("auth.resetPassword")}</CardTitle>
                <CardDescription>{t("auth.resetDesc")}</CardDescription>
              </CardHeader>
              <form onSubmit={handleForgot}>
                <CardContent className="space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">{t("auth.email")}</Label>
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <>
                        {t("auth.sendReset")}
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
                <CardFooter className="justify-center border-t pt-4">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-muted-foreground"
                    onClick={() => {
                      setStep({ mode: "signIn" });
                      setError(null);
                    }}
                  >
                    {t("auth.backToSignIn")}
                  </Button>
                </CardFooter>
              </form>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="mb-2 flex justify-center">
                  <Lock className="size-9 text-brand" />
                </div>
                <CardTitle className="text-xl">{t("auth.setNewPassword")}</CardTitle>
                <CardDescription>{t("auth.setNewPasswordDesc")}</CardDescription>
              </CardHeader>
              <form onSubmit={handleReset}>
                <CardContent className="space-y-4 pb-4">
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          (e.target as HTMLElement).closest("form")?.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("auth.newPasswordField")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        name="newPassword"
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10"
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new">{t("auth.confirmNewPassword")}</Label>
                    <Input
                      id="confirm-new"
                      name="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : t("auth.updatePassword")}
                  </Button>
                </CardContent>
                <CardFooter className="justify-center border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={resendReset}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    {t("auth.resendCode")}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}

          <div className="flex items-center justify-center gap-2 border-t bg-muted/40 px-6 py-3 text-center text-xs text-muted-foreground">
            <span className={cn("inline-flex items-center gap-1.5")}>
              <ShieldCheck className="size-3.5" />
              {t("auth.secBy")}
            </span>
            <span aria-hidden>·</span>
            <LanguageSwitcher className="h-6 border-transparent bg-transparent px-1.5" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
