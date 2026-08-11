import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Geometric play mark used across landing, auth, shells and the player. */
export function CawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" className="fill-foreground" />
      <path
        d="M12.5 10.25 23 16l-10.5 5.75v-11.5Z"
        className="fill-background"
      />
    </svg>
  );
}

/** Mark + wordmark lockup. `dark` renders the light variant (for dark heroes).
 *  When the admin has uploaded a site logo (Admin → Branding), it is shown
 *  instead of the default mark, and the site name replaces the wordmark.
 *
 *  The default mark stays visible while the uploaded logo loads, the image
 *  fades in once it has actually loaded, and on failure the mark remains —
 *  so the header never shows an empty or broken loading box. */
export function Logo({
  className,
  dark = false,
  compact = false,
  src,
}: {
  className?: string;
  dark?: boolean;
  compact?: boolean;
  /** Optional explicit logo URL — falls back to the uploaded site logo. */
  src?: string;
}) {
  const config = useQuery(api.settings.getPublicConfig);
  const logoUrl = src || config?.site.logoUrl || "";
  const name = config?.site.name || "CawStream";

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [logoUrl]);

  const showImg = Boolean(logoUrl) && !imgError;

  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-2 select-none",
        dark ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="relative inline-flex h-7 shrink-0 items-center justify-center">
        {!showImg && (
          <CawMark
            className={dark ? "bg-white rounded-md p-1 box-content size-4" : undefined}
          />
        )}
        {showImg && (
          <img
            src={logoUrl}
            alt=""
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "h-7 w-auto max-w-28 object-contain transition-opacity duration-200",
              dark && "rounded-md bg-white/90 p-0.5",
              imgLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        )}
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-tight">{name}</span>
      )}
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[17px] font-semibold tracking-tight", className)}>
      Caw<span className="font-normal">Stream</span>
    </span>
  );
}
