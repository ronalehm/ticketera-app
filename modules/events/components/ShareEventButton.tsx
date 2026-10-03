"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Check, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEEDBACK_MS = 2000;

type CopyResult = "copied" | "failed";

const STATUS_MESSAGES: Record<CopyResult, string> = {
  copied: "Enlace copiado",
  failed: "No pudimos copiar el enlace",
};

const isAbortError = (error: unknown) =>
  typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";

type ShareEventButtonProps = { title: string } & ComponentProps<"button">;

export function ShareEventButton({ title, className, ...props }: ShareEventButtonProps) {
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const showResult = (result: CopyResult) => {
    clearTimeout(timeoutRef.current);
    setCopyResult(result);
    timeoutRef.current = setTimeout(() => setCopyResult(null), FEEDBACK_MS);
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showResult("copied");
    } catch {
      showResult("failed");
    }
  };

  const handleClick = async () => {
    const url = window.location.href;
    if (typeof navigator.share !== "function") return copyLink(url);

    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (!isAbortError(error)) await copyLink(url);
    }
  };

  const Icon = copyResult === "copied" ? Check : Share2;

  return (
    <>
      <button
        {...props}
        type="button"
        aria-label="Compartir evento"
        onClick={handleClick}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 cursor-pointer duration-200", className)}
      >
        <Icon aria-hidden className="size-5" />
      </button>
      <span role="status" className="sr-only">
        {copyResult && STATUS_MESSAGES[copyResult]}
      </span>
    </>
  );
}
