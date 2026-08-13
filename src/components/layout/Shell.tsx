import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher, useI18n, type DictKey } from "@/lib/i18n";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import {
  Clapperboard,
  Crown,
  Film,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MonitorPlay,
  Palette,
  ScrollText,
  Server,
  Settings2,
  ShieldCheck,
  Stamp,
  Upload,
  User as UserIcon,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

interface NavItem {
  to: string;
  label: DictKey;
  icon: LucideIcon;
  end?: boolean;
}

const USER_NAV: NavItem[] = [
  { to: "/dashboard", label: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/videos", label: "nav.videos", icon: Clapperboard },
  { to: "/dashboard/upload", label: "nav.upload", icon: Upload },
  { to: "/dashboard/advertisements", label: "nav.ads", icon: Megaphone },
  { to: "/dashboard/player", label: "nav.player", icon: Settings2 },
  { to: "/dashboard/profile", label: "nav.profile", icon: UserIcon },
  { to: "/dashboard/security", label: "nav.security", icon: ShieldCheck },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "nav.users", icon: Users },
  { to: "/admin/videos", label: "nav.videos", icon: Film },
  { to: "/admin/storage", label: "nav.storage", icon: HardDrive },
  { to: "/admin/player", label: "nav.player", icon: MonitorPlay },
  { to: "/admin/branding", label: "nav.branding", icon: Stamp },
  { to: "/admin/smtp", label: "nav.smtp", icon: Mail },
  { to: "/admin/system", label: "nav.system", icon: Server },
  { to: "/admin/logs", label: "nav.logs", icon: ScrollText },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const PLAN_NAME: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  platinum: "Platinum",
};

function UserMenu({ onSignOut, onUpgrade }: { onSignOut: () => void; onUpgrade: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const plan = user?.plan ?? "free";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm outline-none ring-ring transition-colors hover:bg-muted/60 focus-visible:ring-2"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
            {initials(user?.name ?? "U")}
          </span>
          <span className="hidden max-w-32 truncate font-medium sm:block">
            {user?.name ?? "Account"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user?.name ?? "Account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="justify-between">
          <span className="flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            {plan === "free" ? t("menu.planFree") : PLAN_NAME[plan]}
          </span>
          {plan === "free" && (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-xs font-medium text-brand hover:underline"
            >
              {t("menu.upgrade")}
            </button>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")}>
              <Server className="mr-2 size-4" />
              {t("nav.admin")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
          <UserIcon className="mr-2 size-4" />
          {t("menu.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/dashboard/security")}>
          <ShieldCheck className="mr-2 size-4" />
          {t("menu.security")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          {t("nav.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4" />
          {t(item.label)}
        </NavLink>
      ))}
    </nav>
  );
}

function ShellFrame({
  nav,
  admin = false,
  extra,
}: {
  nav: NavItem[];
  admin?: boolean;
  extra?: ReactNode;
}) {
  const { user, signOut, isLoading } = useAuth();
  const { t } = useI18n();
  const siteConfig = useQuery(api.settings.getPublicConfig);
  const siteName = siteConfig?.site.name || "Vidood Stream";
  const navigate = useNavigate();
  const location = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  const current = [...nav]
    .slice()
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
    );

  const suspended = user?.status === "suspended";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/60 lg:flex">
        <div className="flex h-14 items-center border-b px-5">
          <Link to={admin ? "/admin" : "/dashboard"}>
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav items={nav} />
        </div>
        <div className="border-t p-4">
          {admin ? (
            <div className="space-y-3">
              <Badge variant="outline" className="w-full justify-center gap-1.5">
                <Server className="size-3" /> {t("nav.administrator")}
              </Badge>
              <Link to="/dashboard" className="block">
                <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground">
                  {t("nav.backDashboard")}
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-center text-[11px] leading-4 text-muted-foreground">
              {t("nav.shellFooter")}
              <br />
              {siteName}
            </p>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile nav */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 lg:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="h-14 justify-center border-b px-5">
                  <SheetTitle>
                    <Link to={admin ? "/admin" : "/dashboard"}>
                      <Logo />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <SidebarNav items={nav} onNavigate={() => {}} />
                </div>
                {admin && (
                  <div className="px-6 pb-4">
                    <Link to="/dashboard">
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                        {t("nav.backDashboard")}
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold tracking-tight">
                {current ? t(current.label) : t("nav.overview")}
              </h1>
              {admin && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Admin
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {!admin && (
              <Link to="/dashboard/upload">
                <Button size="sm" className="hidden sm:inline-flex">
                  <Upload className="mr-1.5 size-3.5" />
                  {t("nav.uploadShort")}
                </Button>
              </Link>
            )}
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <UserMenu onSignOut={handleSignOut} onUpgrade={() => setUpgradeOpen(true)} />
          </div>
        </header>

        {suspended && (
          <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-center text-sm text-destructive sm:px-6">
            {t("shell.suspended")}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {isLoading ? null : <Outlet />}
          {extra}
        </main>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

export function AppShell() {
  return <ShellFrame nav={USER_NAV} />;
}

export function AdminShell() {
  return <ShellFrame nav={ADMIN_NAV} admin />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
