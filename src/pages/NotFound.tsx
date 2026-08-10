import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Clapperboard, Home } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Link to="/">
        <Logo />
      </Link>
      <div>
        <p className="text-6xl font-bold tracking-tight">404</p>
        <h1 className="mt-3 text-xl font-semibold">{t("notFound.title")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("notFound.desc")}
        </p>
      </div>
      <div className="flex gap-3">
        <Link to="/">
          <Button>
            <Home className="mr-2 size-4" />
            {t("notFound.home")}
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="outline">
            <Clapperboard className="mr-2 size-4" />
            {t("nav.overview")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
