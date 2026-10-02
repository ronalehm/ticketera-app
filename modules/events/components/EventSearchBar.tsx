import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CITY_ITEMS = [
  { label: "Todas", value: null },
  ...["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"].map((city) => ({ label: city, value: city })),
];

const labelClassName = "text-xs font-bold tracking-wider text-muted-foreground uppercase";

// Server Component: Select es cliente (de shadcn) y envía su valor con un input oculto `name="ciudad"`.
export function EventSearchBar({ className }: { className?: string }) {
  return (
    <form
      action="/eventos"
      method="get"
      role="search"
      className={cn(
        "grid gap-3 rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border md:grid-cols-[2fr_1fr_1fr_auto] md:items-end md:gap-4 md:p-5",
        className,
      )}
    >
      <div className="grid gap-1.5">
        <label htmlFor="search-q" className={labelClassName}>
          Buscar
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="search-q" name="q" type="search" placeholder="Artista, evento o lugar" className="h-11 pl-9" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Select name="ciudad" items={CITY_ITEMS} defaultValue={null}>
          <SelectPrimitive.Label className={labelClassName}>Ciudad</SelectPrimitive.Label>
          <SelectTrigger className="w-full cursor-pointer data-[size=default]:h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITY_ITEMS.map((city) => (
              <SelectItem key={city.label} value={city.value} className="min-h-11 cursor-pointer">
                {city.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="search-date" className={labelClassName}>
          Fecha
        </label>
        <Input id="search-date" name="fecha" type="date" className="h-11 cursor-pointer" />
      </div>

      <Button type="submit" className="h-11 cursor-pointer px-6 font-semibold hover:bg-primary-strong">
        <Search className="size-5" aria-hidden />
        Buscar
      </Button>
    </form>
  );
}
