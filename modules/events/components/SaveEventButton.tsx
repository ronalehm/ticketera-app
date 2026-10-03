"use client";

import { useEffect, type ComponentProps } from "react";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSavedEventsStore } from "../stores/saved.store";

type SaveEventButtonProps = { slug: string } & ComponentProps<"button">;

export function SaveEventButton({ slug, className, ...props }: SaveEventButtonProps) {
  const saved = useSavedEventsStore((state) => state.slugs.includes(slug));
  const toggle = useSavedEventsStore((state) => state.toggle);

  useEffect(() => {
    useSavedEventsStore.persist.rehydrate();
  }, []);

  return (
    <button
      {...props}
      type="button"
      aria-label="Guardar evento"
      aria-pressed={saved}
      onClick={() => toggle(slug)}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 cursor-pointer duration-200", className)}
    >
      <Heart aria-hidden className={cn("size-5", saved && "fill-current")} />
    </button>
  );
}
