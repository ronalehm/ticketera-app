"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Lock } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/formFields";
import { INLINE_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/modules/auth/session";
import { formatEventPrice } from "@/modules/events/format";
import { checkoutFormSchema } from "../schemas/payment.schema";
import { PaymentError, processMockPayment } from "../services/payment.service";
import type { MockPaymentInput } from "../services/payment.service";
import { persistOrder } from "../stores/orders.store";
import type { CheckoutFormValues, CheckoutOrder } from "../types/checkout.types";
import { CheckoutSummaryPanel } from "./CheckoutSummaryPanel";
import { PaymentMethodFields } from "./PaymentMethodFields";
import { ReservationTimer } from "./ReservationTimer";

const PAYMENT_TITLE_ID = "checkout-payment-title";
const UNEXPECTED_ERROR = "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.";
const PREFILL_FIELDS = ["firstName", "lastName", "email"] as const;

type TextField = "firstName" | "lastName" | "email" | "phone" | "documentNumber";

const INITIAL_VALUES: CheckoutFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  documentType: "dni",
  documentNumber: "",
  paymentMethod: "card",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardName: "",
  acceptTerms: false,
};

type PayButtonProps = {
  totalLabel: string;
  isSubmitting: boolean;
  disabled: boolean;
  className?: string;
};

// Se renderiza dos veces (panel en lg y barra inferior en móvil); en cada ancho solo una es visible.
function PayButton({ totalLabel, isSubmitting, disabled, className }: PayButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className={cn("h-12 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong", className)}
    >
      {isSubmitting ? (
        <>
          <Spinner aria-hidden className="motion-reduce:animate-none" />
          Procesando pago…
        </>
      ) : (
        <>
          <Lock aria-hidden />
          Pagar {totalLabel}
        </>
      )}
    </Button>
  );
}

type CheckoutFormProps = {
  order: CheckoutOrder;
  changeHref: string;
  summary: ReactNode;
};

export function CheckoutForm({ order, changeHref, summary }: CheckoutFormProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isExpired, setIsExpired] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentErrorRef = useRef<HTMLDivElement>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    checkoutFormSchema,
    INITIAL_VALUES,
  );
  const isDni = values.documentType === "dni";
  const totalLabel = formatEventPrice(order.total);

  // Precarga desde la sesión solo en los campos vacíos: nunca sobrescribe lo ya escrito.
  const prefillFromSession = useEffectEvent((sessionUser: NonNullable<typeof user>) => {
    for (const name of PREFILL_FIELDS) {
      if (!values[name]) setValue(name, sessionUser[name]);
    }
  });

  useEffect(() => {
    if (user) prefillFromSession(user);
  }, [user]);

  useEffect(() => {
    if (paymentError) paymentErrorRef.current?.focus();
  }, [paymentError]);

  const submitPayment = handleSubmit(async (data) => {
    setPaymentError(null);
    const { firstName, lastName, email, phone, documentType, documentNumber, paymentMethod, cardNumber } = data;
    const payment: MockPaymentInput["payment"] =
      paymentMethod === "card" ? { method: "card", cardNumber } : { method: paymentMethod };
    try {
      const paidOrder = await processMockPayment({
        order,
        buyer: { firstName, lastName, email, phone, documentType, documentNumber },
        payment,
      });
      await persistOrder(paidOrder);
      router.replace(`/checkout/confirmacion?orden=${paidOrder.code}`);
    } catch (error) {
      setPaymentError(error instanceof PaymentError ? error.message : UNEXPECTED_ERROR);
    }
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isExpired) {
      event.preventDefault();
      return;
    }
    submitPayment(event);
  };

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: TextField) => ({
    id: `checkout-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `checkout-${name}-error` : undefined,
  });

  const fieldError = (name: keyof CheckoutFormValues) => (
    <FieldError id={`checkout-${name}-error`}>{errors[name]}</FieldError>
  );

  const payButtonProps = { totalLabel, isSubmitting, disabled: isExpired || isSubmitting };

  return (
    <div className="flex flex-col gap-6">
      <ReservationTimer retryHref={changeHref} onExpire={() => setIsExpired(true)} />

      <form
        noValidate
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12"
      >
        <Card className="rounded-2xl ring-border lg:col-start-1 lg:row-start-1">
          <CardHeader>
            <h2 className="text-xl font-bold">Datos del comprador</h2>
            <CardDescription className="text-base">Enviaremos tus entradas al correo que indiques.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="checkout-firstName">Nombres</FieldLabel>
              <Input {...textProps("firstName")} autoComplete="given-name" className="h-11" />
              {fieldError("firstName")}
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="checkout-lastName">Apellidos</FieldLabel>
              <Input {...textProps("lastName")} autoComplete="family-name" className="h-11" />
              {fieldError("lastName")}
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="checkout-email">Correo electrónico</FieldLabel>
              <Input {...textProps("email")} type="email" autoComplete="email" className="h-11" />
              {fieldError("email")}
            </Field>
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="checkout-phone">Celular</FieldLabel>
              <InputGroup className="h-11">
                <InputGroupAddon>
                  <InputGroupText>+51</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  {...textProps("phone")}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={9}
                  className="h-full"
                />
              </InputGroup>
              {fieldError("phone")}
            </Field>
            <Field>
              <FieldLabel htmlFor="checkout-documentType">Tipo de documento</FieldLabel>
              <Select
                items={DOCUMENT_TYPE_LABELS}
                value={values.documentType}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("documentType", value);
                  handleBlur("documentType");
                  handleBlur("documentNumber");
                }}
              >
                <SelectTrigger id="checkout-documentType" className="w-full cursor-pointer data-[size=default]:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="min-h-11 cursor-pointer">
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.documentNumber}>
              <FieldLabel htmlFor="checkout-documentNumber">Número de documento</FieldLabel>
              <Input
                {...textProps("documentNumber")}
                inputMode={isDni ? "numeric" : undefined}
                maxLength={isDni ? 8 : undefined}
                className="h-11"
              />
              {fieldError("documentNumber")}
            </Field>
          </CardContent>
        </Card>

        <Card className="rounded-2xl ring-border lg:row-start-2">
          <CardHeader>
            <h2 id={PAYMENT_TITLE_ID} className="text-xl font-bold">
              Método de pago
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <PaymentMethodFields
              values={values}
              errors={errors}
              onChange={setValue}
              onBlur={handleBlur}
              labelledBy={PAYMENT_TITLE_ID}
            />
            {paymentError && (
              <Alert ref={paymentErrorRef} tabIndex={-1} variant="destructive" className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CircleAlert aria-hidden />
                <AlertTitle>{paymentError}</AlertTitle>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Field orientation="horizontal" data-invalid={!!errors.acceptTerms} className="lg:row-start-3">
          <Checkbox
            id="checkout-acceptTerms"
            checked={values.acceptTerms}
            onCheckedChange={(checked) => {
              setValue("acceptTerms", checked);
              handleBlur("acceptTerms");
            }}
            aria-invalid={!!errors.acceptTerms}
            aria-describedby={errors.acceptTerms ? "checkout-acceptTerms-error" : undefined}
          />
          <FieldContent>
            <FieldLabel htmlFor="checkout-acceptTerms" className="block font-normal">
              Acepto los{" "}
              <Link href="/terminos" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                Términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                Política de privacidad
              </Link>
              .
            </FieldLabel>
            {fieldError("acceptTerms")}
          </FieldContent>
        </Field>

        <CheckoutSummaryPanel
          title={order.event.title}
          imageUrl={order.event.imageUrl}
          ticketCount={order.ticketCount}
          totalLabel={totalLabel}
          footer={<PayButton {...payButtonProps} className="hidden lg:flex" />}
          className="order-first lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start"
        >
          {summary}
        </CheckoutSummaryPanel>

        <p role="status" className="sr-only">
          {isSubmitting ? "Procesando pago…" : ""}
        </p>

        <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-6 md:px-6 lg:hidden">
          <PayButton {...payButtonProps} />
        </div>
      </form>
    </div>
  );
}
