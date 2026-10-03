"use client";

import type { ChangeEvent } from "react";
import { CreditCard, Info, Smartphone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../schemas/payment.schema";
import { formatCardExpiry, formatCardNumber } from "../utils/card";
import type { CheckoutFormValues, PaymentMethod } from "../types/checkout.types";

type PaymentFieldName = "paymentMethod" | "cardNumber" | "cardExpiry" | "cardCvv" | "cardName";
type CardFieldName = Exclude<PaymentFieldName, "paymentMethod">;
type PaymentFieldValues = Pick<CheckoutFormValues, PaymentFieldName>;

type PaymentMethodFieldsProps = {
  values: PaymentFieldValues;
  errors: Partial<Record<PaymentFieldName, string>>;
  onChange: <K extends PaymentFieldName>(name: K, value: PaymentFieldValues[K]) => void;
  onBlur: (name: PaymentFieldName) => void;
  /** Id del título de la sección, que nombra al grupo de radios. */
  labelledBy: string;
};

const CARD_FIELDS: CardFieldName[] = ["cardNumber", "cardExpiry", "cardCvv", "cardName"];

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  card: CreditCard,
  yape: Smartphone,
  pagoefectivo: Store,
};

const METHOD_INFO: Partial<Record<PaymentMethod, string>> = {
  yape: "Al continuar te mostraremos un código QR para pagar desde tu app de Yape.",
  pagoefectivo: "Generaremos un código de pago para que pagues en agentes, bodegas o tu banca móvil.",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function PaymentMethodFields({ values, errors, onChange, onBlur, labelledBy }: PaymentMethodFieldsProps) {
  const method = values.paymentMethod;
  const InfoIcon = METHOD_ICONS[method];
  const info = METHOD_INFO[method];

  // Props comunes de los campos de tarjeta: id, valor controlado (con formato), revalidación al salir y a11y del error.
  const cardProps = (name: CardFieldName, format: (value: string) => string = (value) => value) => ({
    id: `checkout-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(name, format(event.target.value)),
    onBlur: () => onBlur(name),
    autoComplete: "off",
    className: "h-11",
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `checkout-${name}-error` : undefined,
  });

  const fieldError = (name: PaymentFieldName) => (
    <FieldError id={`checkout-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="flex gap-2 text-sm text-muted-foreground">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Pago simulado: no se realiza ningún cobro y los datos de tu tarjeta no se envían ni se guardan. Prueba con
          4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada).
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <RadioGroup
          aria-labelledby={labelledBy}
          aria-invalid={!!errors.paymentMethod}
          aria-describedby={errors.paymentMethod ? "checkout-paymentMethod-error" : undefined}
          value={method}
          onValueChange={(value: PaymentMethod) => {
            onChange("paymentMethod", value);
            CARD_FIELDS.forEach((name) => onBlur(name));
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {PAYMENT_METHODS.map((option) => {
            const Icon = METHOD_ICONS[option];
            const id = `checkout-paymentMethod-${option}`;
            return (
              <FieldLabel
                key={option}
                htmlFor={id}
                className="min-h-16 cursor-pointer justify-center has-data-checked:border-primary has-data-checked:bg-accent"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value={option} id={id} />
                  <Icon aria-hidden className="size-5 shrink-0" />
                  <FieldTitle className="text-base font-semibold">{PAYMENT_METHOD_LABELS[option]}</FieldTitle>
                </Field>
              </FieldLabel>
            );
          })}
        </RadioGroup>
        {fieldError("paymentMethod")}
      </div>

      {method === "card" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field data-invalid={!!errors.cardNumber} className="col-span-2">
            <FieldLabel htmlFor="checkout-cardNumber">Número de tarjeta</FieldLabel>
            <Input
              {...cardProps("cardNumber", formatCardNumber)}
              inputMode="numeric"
              maxLength={19}
              placeholder="0000 0000 0000 0000"
            />
            {fieldError("cardNumber")}
          </Field>
          <Field data-invalid={!!errors.cardExpiry}>
            <FieldLabel htmlFor="checkout-cardExpiry">Vencimiento</FieldLabel>
            <Input {...cardProps("cardExpiry", formatCardExpiry)} inputMode="numeric" maxLength={5} placeholder="MM/AA" />
            {fieldError("cardExpiry")}
          </Field>
          <Field data-invalid={!!errors.cardCvv}>
            <FieldLabel htmlFor="checkout-cardCvv">CVV</FieldLabel>
            <Input {...cardProps("cardCvv", onlyDigits)} inputMode="numeric" maxLength={4} placeholder="3 o 4 dígitos" />
            {fieldError("cardCvv")}
          </Field>
          <Field data-invalid={!!errors.cardName} className="col-span-2 sm:col-span-4">
            <FieldLabel htmlFor="checkout-cardName">Nombre en la tarjeta</FieldLabel>
            <Input {...cardProps("cardName")} placeholder="Como aparece en la tarjeta" />
            {fieldError("cardName")}
          </Field>
        </div>
      ) : (
        info && (
          <p className="flex items-start gap-3 rounded-2xl bg-accent p-4 text-sm text-accent-foreground sm:text-base">
            <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
            {info}
          </p>
        )
      )}
    </div>
  );
}
