import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "icon";
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Could not copy — select and copy manually.");
    }
  };

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onCopy}
        className={cn("size-8", className)}
        aria-label={label}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCopy}
      className={cn("h-8 gap-1.5", className)}
    >
      {copied ? (
        <Check className="size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
