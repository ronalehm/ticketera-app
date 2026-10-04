import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import { PRICE_RANGES } from "../data/searchOptions";
import type { EventFilters } from "../schemas/eventFilters.schema";
import { buildEventsHref, toSearchParamEntries, type MonthOption } from "../utils/eventFilters";

/** Claves que el buscador muestra; el resto de filtros de la URL viaja en inputs ocultos. */
const VISIBLE_KEYS = new Set(["q", "mes", "precio"]);

/**
 * Campo de texto sin borde ni sombra. `< md`: 44 px con hueco a la izquierda para la lupa. md+: ocupa todo el segmento
 * (56 px) con hueco arriba para la etiqueta.
 */
const CONTROL_CLASS =
  "h-11 cursor-pointer rounded-xl border-0 bg-transparent py-1 pr-4 pl-10 shadow-none focus-visible:ring-2 focus-visible:ring-ring md:h-14 md:pt-5 md:pb-1 md:pl-4 dark:bg-transparent";

// `className` de NativeSelect va al wrapper: el <select> y su icono se estilizan desde ahí (mismas reglas que CONTROL_CLASS).
const SELECT_CLASS =
  "w-full *:data-[slot=native-select]:h-14 *:data-[slot=native-select]:cursor-pointer *:data-[slot=native-select]:rounded-xl *:data-[slot=native-select]:border-0 *:data-[slot=native-select]:bg-transparent *:data-[slot=native-select]:pt-5 *:data-[slot=native-select]:pb-1 *:data-[slot=native-select]:pl-4 *:data-[slot=native-select]:pr-10 *:data-[slot=native-select]:shadow-none *:data-[slot=native-select]:focus-visible:ring-2 *:data-[slot=native-select]:focus-visible:ring-ring *:data-[slot=native-select]:dark:bg-transparent *:data-[slot=native-select]:dark:hover:bg-transparent *:data-[slot=native-select-icon]:right-4";

type SearchSegmentProps = { id: string; label: string; className?: string; children: ReactNode };

/** Segmento con su etiqueta flotante. `< md` la etiqueta queda solo para lectores de pantalla. */
function SearchSegment({ id, label, className, children }: SearchSegmentProps) {
  return (
    <div className={cn("relative rounded-xl transition-colors duration-200 hover:bg-accent/60", className)}>
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2 left-4 z-10 text-xs font-bold text-foreground max-md:sr-only"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type EventSearchBarProps = {
  /** Meses con eventos (`getEventMonths`), los mismos que la barra lateral. */
  months: MonthOption[];
  /** Filtros de la URL. En la landing no se pasan. */
  defaultValues?: EventFilters;
  className?: string;
};

/**
 * Server Component. Barra píldora única de `/eventos` y la landing: "Qué quieres ver" (`q`), "Fecha" (`mes`),
 * "Precio" (`precio`) y "Buscar". Campos no controlados; el `key` del form (la URL serializada) lo vuelve a montar
 * cuando otro control cambia la URL. `< md`: una fila compacta con lupa, texto y "Buscar"; Fecha y Precio se ocultan
 * pero siguen en el form y se envían (conservan `mes` y `precio` de la URL). md+: una fila con divisores verticales.
 */
export function EventSearchBar({ months, defaultValues, className }: EventSearchBarProps) {
  const values = defaultValues ?? {};
  const hiddenEntries = toSearchParamEntries(values).filter(([key]) => !VISIBLE_KEYS.has(key));

  return (
    <section aria-label="Buscar eventos" className={cn("mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8 lg:px-8", className)}>
      <form
        key={buildEventsHref(values)}
        action="/eventos"
        method="get"
        role="search"
        className="flex items-center gap-2 rounded-2xl bg-card p-1.5 shadow-lg ring-1 shadow-foreground/5 ring-border md:grid md:gap-0 md:p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)_auto] md:items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_minmax(0,13rem)_auto]"
      >
        <div className="min-w-0 flex-1 divide-border md:col-span-3 md:grid md:grid-cols-subgrid md:items-center md:divide-x">
          <SearchSegment id="search-q" label="Qué quieres ver">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground md:hidden"
              aria-hidden
            />
            <Input
              id="search-q"
              name="q"
              type="search"
              placeholder="Artista, evento o ciudad"
              defaultValue={values.q}
              className={CONTROL_CLASS}
            />
          </SearchSegment>

          <SearchSegment id="search-mes" label="Fecha" className="max-md:hidden">
            <NativeSelect id="search-mes" name="mes" defaultValue={values.mes ?? ""} className={SELECT_CLASS}>
              <NativeSelectOption value="">Cualquier fecha</NativeSelectOption>
              {months.map((month) => (
                <NativeSelectOption key={month.value} value={month.value}>
                  {month.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </SearchSegment>

          <SearchSegment id="search-precio" label="Precio" className="max-md:hidden">
            <NativeSelect id="search-precio" name="precio" defaultValue={values.precio ?? ""} className={SELECT_CLASS}>
              <NativeSelectOption value="">Cualquier precio</NativeSelectOption>
              {PRICE_RANGES.map((range) => (
                <NativeSelectOption key={range.value} value={range.value}>
                  {range.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </SearchSegment>
        </div>

        {hiddenEntries.map(([key, value]) => (
          <input key={`${key}-${value}`} type="hidden" name={key} value={value} />
        ))}

        <Button
          type="submit"
          className="h-11 w-auto shrink-0 cursor-pointer rounded-xl px-4 font-semibold hover:bg-primary-strong md:ml-2 md:h-12 md:px-6"
        >
          <Search className="size-5 max-md:hidden" aria-hidden />
          Buscar
        </Button>
      </form>
    </section>
  );
}
