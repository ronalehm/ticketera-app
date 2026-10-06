"use client";

import { useId, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarDays } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO_DATE = "yyyy-MM-dd";

// Día calendario en hora local: nunca pasa por UTC, así que el día no se desplaza.
function toDate(value?: string) {
  if (!value) return undefined;
  const date = parse(value, ISO_DATE, new Date());
  return isValid(date) ? date : undefined;
}

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** Id de la etiqueta visible: el nombre accesible pasa a ser «etiqueta + fecha elegida (o placeholder)». */
  "aria-labelledby"?: string;
};

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  id,
  placeholder = "Selecciona una fecha",
  className,
  "aria-labelledby": labelledBy,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const valueId = useId();
  const selected = toDate(value);
  const minDate = toDate(min);
  const maxDate = toDate(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        {...aria}
        // Con `<label htmlFor>` el nombre sería solo la etiqueta: se le suma el texto visible para anunciar la fecha.
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        render={
          <Button
            variant="outline"
            className={cn(
              "h-11 w-full cursor-pointer justify-start gap-2 px-3 text-left font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
        <span id={valueId} className="truncate">
          {selected ? format(selected, "EEE d MMM yyyy", { locale: es }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected ?? minDate}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          onSelect={(date) => {
            if (date) onChange(format(date, ISO_DATE));
            setOpen(false);
          }}
          className="[--cell-size:--spacing(11)]"
        />
      </PopoverContent>
    </Popover>
  );
}
