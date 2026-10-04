"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Lock } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/formFields";
import { INLINE_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/modules/auth/session";
import { formatEventPrice } from "@/modules/events/format";
import { checkoutFormSchema } from "../schemas/payment.schema";
import { PaymentError, processMockPayment } from "../services/payment.service";
import type { MockPaymentInput } from "../services/payment.service";
import { persistOrder } from "../stores/orders.store";
import type { CheckoutFormValues, CheckoutOrder } from "../types/checkout.types";
import { CheckoutSummaryPanel } from "./CheckoutSummaryPanel";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodFields } from "./PaymentMethodFields";
import { RequiredMark } from "./RequiredMark";
import { ReservationTimer } from "./ReservationTimer";

const PAYMENT_TITLE_ID = "checkout-payment-title";
const UNEXPECTED_ERROR = "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.";
const PREFILL_FIELDS = ["firstName", "lastName", "email"] as const;

type TextField = "firstName" | "lastName" | "email" | "phone" | "documentNumber";

// Abreviatura para el selector estrecho (w-32); la lista desplegada conserva los nombres completos.
const DOCUMENT_TYPE_SHORT_LABELS = {
  dni: "DNI",
  ce: "CE",
  passport: "Pasaporte",
} satisfies Record<CheckoutFormValues["documentType"], string>;

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
  isProcessing: boolean;
  disabled: boolean;
  termsPending: boolean;
  className?: string;
};

// Se renderiza dos veces (tarjeta del resumen en lg y barra inferior en móvil); en cada ancho solo una es visible.
// Con Términos pendientes usa `aria-disabled` (no `disabled`): sigue en el orden de Tab y el envío llega a `onSubmit`,
// que lleva el foco a la casilla. `disabled` nativo solo al expirar la reserva o mientras se procesa.
function PayButton({ totalLabel, isProcessing, disabled, termsPending, className }: PayButtonProps) {
  const hintId = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="submit"
        disabled={disabled}
        aria-disabled={termsPending ? "true" : undefined}
        aria-describedby={termsPending ? hintId : undefined}
        className="h-12 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary aria-disabled:active:not-aria-[haspopup]:translate-y-0"
      >
        {isProcessing ? (
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
      {termsPending && (
        <p id={hintId} className="text-center text-sm text-muted-foreground">
          Acepta los términos para continuar.
        </p>
      )}
    </div>
  );
}

type CheckoutFormProps = {
  order: CheckoutOrder;
  changeHref: string;
};

export function CheckoutForm({ order, changeHref }: CheckoutFormProps) {
  const router = useRouter();
  const { user } = useSessionUser();
  const [isExpired, setIsExpired] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Tras un pago aprobado, useZodForm vuelve a isSubmitting=false mientras la navegación sigue en curso:
  // este estado mantiene "Pagar" bloqueado para que no se pueda crear una segunda orden.
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Guarda síncrona contra envíos concurrentes: dos requestSubmit() en el mismo tick llegan antes de que React
  // re-renderice, así que isSubmitting/isRedirecting aún valen false en el segundo. Se libera solo si el pago falla.
  const paymentInFlightRef = useRef(false);
  const paymentErrorRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLElement>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    checkoutFormSchema,
    INITIAL_VALUES,
  );
  const isDni = values.documentType === "dni";
  const totalLabel = formatEventPrice(order.total);

  // Precarga desde la sesión solo en los campos vacíos: nunca sobrescribe lo ya escrito. Sin sesión (invitado) no hace nada.
  const prefillFromSession = useEffectEvent(() => {
    if (!user) return;
    for (const name of PREFILL_FIELDS) {
      if (!values[name]) setValue(name, user[name]);
    }
  });

  // Depende del correo, no de `user`: el hook devuelve un objeto nuevo en cada render y la precarga
  // volvería a rellenar un campo que el comprador vació a propósito.
  const sessionEmail = user?.email;
  useEffect(() => {
    if (sessionEmail) prefillFromSession();
  }, [sessionEmail]);

  useEffect(() => {
    if (paymentError) paymentErrorRef.current?.focus();
  }, [paymentError]);

  const isProcessing = isSubmitting || isRedirecting;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Se corta antes de handleSubmit: si no, su `finally` pondría isSubmitting=false con el primer pago aún en curso.
    if (isExpired || isProcessing || paymentInFlightRef.current) {
      event.preventDefault();
      return;
    }
    // Sin Términos no se valida (ni errores ni service): el foco va a la casilla, que explica por qué no se paga.
    if (!values.acceptTerms) {
      event.preventDefault();
      termsRef.current?.focus();
      return;
    }
    handleSubmit(async (data) => {
      // useZodForm invoca este callback de forma síncrona dentro del submit: la ref queda marcada antes del siguiente.
      paymentInFlightRef.current = true;
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
        setIsRedirecting(true);
        router.replace(`/checkout/confirmacion?orden=${paidOrder.code}`);
      } catch (error) {
        paymentInFlightRef.current = false;
        setPaymentError(error instanceof PaymentError ? error.message : UNEXPECTED_ERROR);
      }
    })(event);
  };

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: TextField) => ({
    id: `checkout-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    required: true,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `checkout-${name}-error` : undefined,
  });

  const fieldError = (name: keyof CheckoutFormValues) => (
    <FieldError id={`checkout-${name}-error`}>{errors[name]}</FieldError>
  );

  const termsPending = !values.acceptTerms && !isExpired && !isProcessing;
  const payButtonProps = { totalLabel, isProcessing, disabled: isExpired || isProcessing, termsPending };

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
            <CardDescription className="text-base">
              <span className="sm:hidden">Enviaremos tus entradas a este correo.</span>
              <span className="max-sm:hidden">Enviaremos tus entradas al correo que indiques.</span> Los campos con *
              son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="checkout-firstName">
                <span>
                  Nombres
                  <RequiredMark />
                </span>
              </FieldLabel>
              <Input
                {...textProps("firstName")}
                autoComplete="given-name"
                placeholder="Como figura en tu documento"
                className="h-11"
              />
              {fieldError("firstName")}
            </Field>
            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="checkout-lastName">
                <span>
                  Apellidos
                  <RequiredMark />
                </span>
              </FieldLabel>
              <Input
                {...textProps("lastName")}
                autoComplete="family-name"
                placeholder="Como figura en tu documento"
                className="h-11"
              />
              {fieldError("lastName")}
            </Field>
            <Field data-invalid={!!errors.email} className="sm:col-span-2">
              <FieldLabel htmlFor="checkout-email">
                <span>
                  Correo electrónico
                  <RequiredMark />
                </span>
              </FieldLabel>
              <Input
                {...textProps("email")}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className="h-11"
              />
              {fieldError("email")}
            </Field>
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="checkout-phone">
                <span>
                  Celular
                  <RequiredMark />
                </span>
              </FieldLabel>
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
                  placeholder="Número de celular"
                  className="h-full"
                />
              </InputGroup>
              {fieldError("phone")}
            </Field>
            <FieldSet data-invalid={!!errors.documentNumber} className="min-w-0 gap-2 data-[invalid=true]:text-destructive">
              <FieldLegend variant="label" className="mb-2">
                Documento de identidad
                <RequiredMark />
              </FieldLegend>
              <div className="flex gap-2">
                <FieldLabel htmlFor="checkout-documentType" className="sr-only">
                  Tipo de documento
                </FieldLabel>
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
                  <SelectTrigger
                    id="checkout-documentType"
                    className="w-32 shrink-0 cursor-pointer data-[size=default]:h-11"
                  >
                    <SelectValue>
                      {(value: CheckoutFormValues["documentType"]) => DOCUMENT_TYPE_SHORT_LABELS[value]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="min-h-11 cursor-pointer">
                        {DOCUMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldLabel htmlFor="checkout-documentNumber" className="sr-only">
                  Número de documento
                </FieldLabel>
                <Input
                  {...textProps("documentNumber")}
                  inputMode={isDni ? "numeric" : undefined}
                  maxLength={isDni ? 8 : undefined}
                  placeholder="Número"
                  className="h-11 min-w-0 flex-1"
                />
              </div>
              {fieldError("documentNumber")}
            </FieldSet>
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
              <Alert
                ref={paymentErrorRef}
                tabIndex={-1}
                variant="destructive"
                className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleAlert aria-hidden />
                <AlertTitle>{paymentError}</AlertTitle>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Field orientation="horizontal" data-invalid={!!errors.acceptTerms} className="lg:row-start-3">
          <Checkbox
            ref={termsRef}
            id="checkout-acceptTerms"
            required
            className="bg-background"
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
              <RequiredMark />
            </FieldLabel>
            {fieldError("acceptTerms")}
          </FieldContent>
        </Field>

        <CheckoutSummaryPanel
          title={order.event.title}
          imageUrl={order.event.imageUrl}
          ticketCount={order.ticketCount}
          totalLabel={totalLabel}
          className="order-first lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start"
        >
          <OrderSummary
            order={order}
            changeHref={changeHref}
            footer={<PayButton {...payButtonProps} className="hidden lg:flex" />}
          />
        </CheckoutSummaryPanel>

        <p role="status" className="sr-only">
          {isProcessing ? "Procesando pago…" : ""}
        </p>

        <div className="sticky bottom-0 z-30 -mx-4 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:-mx-6 md:px-6 lg:hidden">
          <PayButton {...payButtonProps} />
        </div>
      </form>
    </div>
  );
}
