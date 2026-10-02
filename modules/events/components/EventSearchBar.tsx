import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SelectOption = { label: string; value: string | null };

const CITY_ITEMS: SelectOption[] = [
  { label: "Todas", value: null },
  ...["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"].map((city) => ({ label: city, value: city })),
];

const PRICE_ITEMS: SelectOption[] = [
  { label: "Cualquier precio", value: null },
  { label: "Gratis", value: "gratis" },
  { label: "Hasta S/ 50", value: "0-50" },
  { label: "S/ 50 – S/ 100", value: "50-100" },
  { label: "S/ 100 – S/ 200", value: "100-200" },
  { label: "Más de S/ 200", value: "200-mas" },
];

const labelClassName = "text-xs font-bold tracking-wider text-muted-foreground uppercase";

// Select es cliente (de shadcn) y envía su valor con un input oculto `name`; `null` envía vacío.
function SelectField({ name, label, items }: { name: string; label: string; items: SelectOption[] }) {
  return (
    <div className="grid gap-1.5">
      <Select name={name} items={items} defaultValue={null}>
        <SelectPrimitive.Label className={labelClassName}>{label}</SelectPrimitive.Label>
        <SelectTrigger className="w-full cursor-pointer data-[size=default]:h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.label} value={item.value} className="min-h-11 cursor-pointer">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Server Component: buscador de la home. Móvil: apilado; md: texto en su fila + ciudad/fecha/precio/Buscar; lg: una fila.
export function EventSearchBar({ className }: { className?: string }) {
  return (
    <section aria-label="Buscar eventos" className={cn("mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8 lg:px-8", className)}>
      <form
        action="/eventos"
        method="get"
        role="search"
        className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-border md:grid-cols-4 md:items-end md:gap-4 md:p-5 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        <div className="grid gap-1.5 md:col-span-4 lg:col-span-1">
          <label htmlFor="search-q" className={labelClassName}>
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="search-q" name="q" type="search" placeholder="Artista, evento o lugar" className="h-11 pl-9" />
          </div>
        </div>

        <SelectField name="ciudad" label="Ciudad" items={CITY_ITEMS} />

        <div className="grid gap-1.5">
          <label htmlFor="search-date" className={labelClassName}>
            Fecha
          </label>
          <Input id="search-date" name="fecha" type="date" className="h-11 cursor-pointer" />
        </div>

        <SelectField name="precio" label="Precio" items={PRICE_ITEMS} />

        <Button type="submit" className="h-11 cursor-pointer px-6 font-semibold hover:bg-primary-strong">
          <Search className="size-5" aria-hidden />
          Buscar
        </Button>
      </form>
    </section>
  );
}
