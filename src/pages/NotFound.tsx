import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Clapperboard, Home } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 text-center">
      <Link to="/">
        <Logo />
      </Link>
      <div>
        <p className="text-6xl font-bold tracking-tight">404</p>
        <h1 className="mt-3 text-xl font-semibold">This page isn’t in the library</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          The page you’re looking for was removed, renamed, or never existed in
          the first place.
        </p>
      </div>
      <div className="flex gap-3">
        <Link to="/">
          <Button>
            <Home className="mr-2 size-4" />
            Back to home
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="outline">
            <Clapperboard className="mr-2 size-4" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
