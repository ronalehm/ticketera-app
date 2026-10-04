"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/formFields";
import { INLINE_LINK } from "@/lib/linkStyles";
import { completeProfileAction } from "../actions/profile.actions";
import { completeProfileSchema } from "../schemas/auth.schema";
import type { CompleteProfileInput } from "../types/auth.types";

const GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo.";

const INITIAL_VALUES: CompleteProfileInput = {
  phone: "",
  documentType: "dni",
  documentNumber: "",
  acceptTerms: false,
  marketingOptIn: false,
};

/** "Completa tu perfil": celular, documento y consentimientos. Si se guarda, la acción redirige a `redirectUrl`. */
export function CompleteProfileForm({ redirectUrl }: { redirectUrl: string | null }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    completeProfileSchema,
    INITIAL_VALUES,
  );
  const isDni = values.documentType === "dni";

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      // Si guarda, la acción redirige y no hay resultado.
      const result = await completeProfileAction(data, redirectUrl);
      if (result?.error) setServerError(result.error);
    } catch {
      setServerError(GENERIC_ERROR);
    }
  });

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: "phone" | "documentNumber") => ({
    id: `profile-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `profile-${name}-error` : undefined,
  });

  const fieldError = (name: keyof CompleteProfileInput) => (
    <FieldError id={`profile-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Completa tu perfil</h1>
        <p className="text-base text-muted-foreground">Lo usamos para emitir tus entradas a tu nombre.</p>
      </div>

      <form noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {serverError && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>{serverError}</AlertTitle>
            </Alert>
          )}

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="profile-phone">Celular</FieldLabel>
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

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <Field>
              <FieldLabel htmlFor="profile-documentType">Tipo de documento</FieldLabel>
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
                <SelectTrigger id="profile-documentType" className="w-full cursor-pointer data-[size=default]:h-11">
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
              <FieldLabel htmlFor="profile-documentNumber">Número de documento</FieldLabel>
              <Input
                {...textProps("documentNumber")}
                inputMode={isDni ? "numeric" : undefined}
                maxLength={isDni ? 8 : undefined}
                className="h-11"
              />
              {fieldError("documentNumber")}
            </Field>
          </div>

          <Field orientation="horizontal" data-invalid={!!errors.acceptTerms}>
            <Checkbox
              id="profile-acceptTerms"
              checked={values.acceptTerms}
              onCheckedChange={(checked) => {
                setValue("acceptTerms", checked);
                handleBlur("acceptTerms");
              }}
              aria-invalid={!!errors.acceptTerms}
              aria-describedby={errors.acceptTerms ? "profile-acceptTerms-error" : undefined}
            />
            <FieldContent>
              <FieldLabel htmlFor="profile-acceptTerms" className="block font-normal">
                Acepto los{" "}
                <Link href="/terminos" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                  Términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                  Política de privacidad
                </Link>
                , incluida la transferencia internacional de mis datos a proveedores en EE. UU.
              </FieldLabel>
              {fieldError("acceptTerms")}
            </FieldContent>
          </Field>

          <Field orientation="horizontal">
            <Checkbox
              id="profile-marketingOptIn"
              checked={values.marketingOptIn}
              onCheckedChange={(checked) => setValue("marketingOptIn", checked)}
            />
            <FieldLabel htmlFor="profile-marketingOptIn" className="font-normal">
              Quiero recibir novedades y promociones por correo
            </FieldLabel>
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong"
          >
            {isSubmitting ? (
              <>
                <Spinner aria-hidden className="motion-reduce:animate-none" />
                Guardando…
              </>
            ) : (
              "Guardar y continuar"
            )}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
