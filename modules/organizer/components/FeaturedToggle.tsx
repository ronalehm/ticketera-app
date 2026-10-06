import type { ComponentProps } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Texto de la acción según el estado actual (spec events-dynamic-landing, Decisión 11). */
export function featuredLabel(featured: boolean): string {
  return featured ? "Quitar destacado" : "Destacar";
}

/** Estrella de la acción: rellena si el evento ya está destacado. */
export function FeaturedIcon({ featured, className }: { featured: boolean; className?: string }) {
  return <Star className={cn(featured && "fill-current", className)} aria-hidden />;
}

type FeaturedToggleProps = Omit<ComponentProps<typeof Button>, "children" | "aria-pressed"> & { featured: boolean };

/** Botón conmutador de destacado (admin): `aria-pressed` con el estado, 44 px de alto. */
export function FeaturedToggle({ featured, className, ...props }: FeaturedToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={featured}
      className={cn("h-11 cursor-pointer gap-1.5 px-3 font-semibold duration-200", className)}
      {...props}
    >
      <FeaturedIcon featured={featured} className="size-4" />
      {featuredLabel(featured)}
    </Button>
  );
}
