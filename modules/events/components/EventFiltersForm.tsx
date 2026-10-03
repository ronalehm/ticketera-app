"use client";

import { useRouter } from "next/navigation";
import { startTransition, useOptimistic, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "../data/categories";
import { CITIES, PRICE_RANGES } from "../data/searchOptions";
import type { EventFilters } from "../schemas/eventFilters.schema";
import {
  buildEventsHref,
  parseEventFilters,
  toggleFilterValue,
  toSearchParamEntries,
  type FacetCounts,
  type MonthOption,
} from "../utils/eventFilters";

export type FilterSection = "categoria" | "ciudad" | "mes" | "precio";

type EventFiltersFormProps = {
  filters: EventFilters;
  facets: FacetCounts;
  months: MonthOption[];
  sections: FilterSection[];
  className?: string;
};

const OPTION_CLASS = "flex h-11 cursor-pointer items-center gap-3 text-sm";
const INPUT_CLASS =
  "size-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const countLabel = (count: number) => `${count} ${count === 1 ? "evento" : "eventos"}`;

function FilterFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    // El <legend> no respeta el padding del fieldset; el espaciado vertical va en un contenedor propio.
    <div className="py-4 last:pb-0">
      <fieldset className="flex flex-col">
        <legend className="pb-2 text-sm font-bold">{legend}</legend>
        {children}
      </fieldset>
    </div>
  );
}

function CheckboxOption({
  name,
  value,
  label,
  count,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={OPTION_CLASS}>
      <input type="checkbox" name={name} value={value} checked={checked} onChange={onChange} className={INPUT_CLASS} />
      {/* El sr-only va dentro del mismo span: como ítem flex aparte, Chromium añade un espacio antes de la coma. */}
      <span className="flex-1">
        {label}
        <span className="sr-only">, {countLabel(count)}</span>
      </span>
      <span className="text-muted-foreground tabular-nums" aria-hidden>
        {count}
      </span>
    </label>
  );
}

function RadioOption({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={OPTION_CLASS}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className={INPUT_CLASS} />
      <span>{label}</span>
    </label>
  );
}

/**
 * Formulario GET de filtros (mejora progresiva): sin JS se envía con "Aplicar filtros";
 * con JS cada cambio navega al momento y el control responde sin esperar al servidor.
 */
export function EventFiltersForm({ filters, facets, months, sections, className }: EventFiltersFormProps) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(filters);

  const apply = (next: EventFilters) => {
    // Se normaliza para que las claves de la URL sigan el orden del schema (toggleFilterValue añade al final).
    const normalized = parseEventFilters(next);
    startTransition(() => {
      setOptimistic(normalized);
      router.push(buildEventsHref(normalized), { scroll: false });
    });
  };

  // Los filtros que este formulario no muestra (más q, fecha y orden) viajan ocultos en el envío sin JS.
  const sectionKeys: readonly string[] = sections;
  const hiddenEntries = toSearchParamEntries(filters).filter(([key]) => !sectionKeys.includes(key));

  const renderSection = (section: FilterSection) => {
    switch (section) {
      case "categoria":
        return (
          <FilterFieldset key={section} legend="Categoría">
            {EVENT_CATEGORIES.map((category) => (
              <CheckboxOption
                key={category}
                name="categoria"
                value={category}
                label={EVENT_CATEGORY_LABELS[category]}
                count={facets.categoria[category]}
                checked={optimistic.categoria?.includes(category) ?? false}
                onChange={() => apply(toggleFilterValue(optimistic, "categoria", category))}
              />
            ))}
          </FilterFieldset>
        );
      case "ciudad":
        return (
          <FilterFieldset key={section} legend="Ciudad">
            {CITIES.map((city) => (
              <CheckboxOption
                key={city}
                name="ciudad"
                value={city}
                label={city}
                count={facets.ciudad[city]}
                checked={optimistic.ciudad?.includes(city) ?? false}
                onChange={() => apply(toggleFilterValue(optimistic, "ciudad", city))}
              />
            ))}
          </FilterFieldset>
        );
      case "mes":
        return (
          <FilterFieldset key={section} legend="Fecha">
            <RadioOption
              name="mes"
              value=""
              label="Cualquier fecha"
              checked={!optimistic.mes}
              onChange={() => apply({ ...optimistic, mes: undefined })}
            />
            {months.map((month) => (
              <RadioOption
                key={month.value}
                name="mes"
                value={month.value}
                label={month.label}
                checked={optimistic.mes === month.value}
                onChange={() => apply({ ...optimistic, mes: month.value })}
              />
            ))}
          </FilterFieldset>
        );
      case "precio":
        return (
          <FilterFieldset key={section} legend="Precio desde">
            <RadioOption
              name="precio"
              value=""
              label="Cualquier precio"
              checked={!optimistic.precio}
              onChange={() => apply({ ...optimistic, precio: undefined })}
            />
            {PRICE_RANGES.map((range) => (
              <RadioOption
                key={range.value}
                name="precio"
                value={range.value}
                label={range.label}
                checked={optimistic.precio === range.value}
                onChange={() => apply({ ...optimistic, precio: range.value })}
              />
            ))}
          </FilterFieldset>
        );
    }
  };

  return (
    <form action="/eventos" method="get" className={cn("flex flex-col", className)}>
      <div className="divide-y divide-border">{sections.map(renderSection)}</div>
      {hiddenEntries.map(([name, value]) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
      ))}
      <noscript>
        <Button type="submit" className="mt-4 h-11 w-full cursor-pointer font-semibold hover:bg-primary-strong">
          Aplicar filtros
        </Button>
      </noscript>
    </form>
  );
}
