import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { CITIES, PRICE_RANGES } from "../data/searchOptions";
import type { EventFilters } from "../schemas/eventFilters.schema";

type SelectOption = { label: string; value: string | null };

const CITY_ITEMS: SelectOption[] = [
  { label: "Todas", value: null },
  ...CITIES.map((city) => ({ label: city, value: city })),
];

const PRICE_ITEMS: SelectOption[] = [{ label: "Cualquier precio", value: null }, ...PRICE_RANGES];

const labelClassName = "text-xs font-bold tracking-wider text-muted-foreground uppercase";

// Select es cliente (de shadcn) y envía su valor con un input oculto `name`; `null` envía vacío.
function SelectField({
  name,
  label,
  items,
  defaultValue,
}: {
  name: string;
  label: string;
  items: SelectOption[];
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Select name={name} items={items} defaultValue={defaultValue ?? null}>
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

// Server Component: buscador de la home y de /eventos (precargado con `defaultValues`). Móvil: apilado; md: texto en su fila + ciudad/fecha/precio/Buscar; lg: una fila.
export function EventSearchBar({ className, defaultValues }: { className?: string; defaultValues?: EventFilters }) {
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
            <Input
              id="search-q"
              name="q"
              type="search"
              placeholder="Artista, evento o lugar"
              className="h-11 pl-9"
              defaultValue={defaultValues?.q}
            />
          </div>
        </div>

        <SelectField name="ciudad" label="Ciudad" items={CITY_ITEMS} defaultValue={defaultValues?.ciudad} />

        <div className="grid gap-1.5">
          <label htmlFor="search-date" className={labelClassName}>
            Fecha
          </label>
          <Input
            id="search-date"
            name="fecha"
            type="date"
            className="h-11 cursor-pointer"
            defaultValue={defaultValues?.fecha}
          />
        </div>

        <SelectField name="precio" label="Precio" items={PRICE_ITEMS} defaultValue={defaultValues?.precio} />

        {defaultValues?.categoria && <input type="hidden" name="categoria" value={defaultValues.categoria} />}

        <Button type="submit" className="h-11 cursor-pointer px-6 font-semibold hover:bg-primary-strong">
          <Search className="size-5" aria-hidden />
          Buscar
        </Button>
      </form>
    </section>
  );
}
