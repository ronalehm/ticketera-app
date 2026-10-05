"use client";

import type { ReactNode } from "react";
import { CreditCard, Info, Lock, Smartphone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../schemas/payment.schema";

type PaymentMethodFieldsProps = {
  /** Id del título de la sección, que nombra al grupo de radios. */
  labelledBy: string;
  /** Payment Element de Stripe y sus estados (carga, error). */
  children: ReactNode;
};

const METHOD_ICONS = {
  card: CreditCard,
  yape: Smartphone,
  pagoefectivo: Store,
} satisfies Record<(typeof PAYMENT_METHODS)[number], LucideIcon>;

// Etiqueta larga solo por debajo de sm, donde los métodos van apilados a todo el ancho.
const CARD_MOBILE_SUFFIX = " de crédito o débito";

/** "Método de pago": solo Tarjeta (Stripe); Yape y PagoEfectivo se ven deshabilitados con "Próximamente". */
export function PaymentMethodFields({ labelledBy, children }: PaymentMethodFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <RadioGroup aria-labelledby={labelledBy} defaultValue="card" className="grid gap-3 sm:grid-cols-3">
        {PAYMENT_METHODS.map((option) => {
          const Icon = METHOD_ICONS[option];
          const id = `checkout-paymentMethod-${option}`;
          const isCard = option === "card";
          return (
            <FieldLabel
              key={option}
              htmlFor={id}
              className="min-h-16 cursor-pointer justify-center has-data-checked:border-primary has-data-checked:bg-accent has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
            >
              <Field orientation="horizontal">
                <RadioGroupItem value={option} id={id} disabled={!isCard} />
                <Icon aria-hidden className="size-5 shrink-0" />
                <FieldTitle className="flex-wrap text-base font-semibold">
                  {/* Un solo nodo de texto en línea: FieldTitle es flex con gap y separaría el sufijo. */}
                  <span>
                    {PAYMENT_METHOD_LABELS[option]}
                    {isCard && <span className="sm:hidden">{CARD_MOBILE_SUFFIX}</span>}
                  </span>
                  {!isCard && <Badge variant="secondary">Próximamente</Badge>}
                </FieldTitle>
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>

      {children}

      <p className="flex gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta.
      </p>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Modo de prueba: no se realiza ningún cobro real. Tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y
        CVC.
      </p>
    </div>
  );
}
