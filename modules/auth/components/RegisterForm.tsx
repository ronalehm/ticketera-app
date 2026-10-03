"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/formFields";
import { INLINE_LINK, TEXT_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { registerSchema } from "../schemas/auth.schema";
import { AuthError, register } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import type { RegisterInput } from "../types/auth.types";
import { GENERIC_ERROR } from "./formShared";
import { PasswordInput } from "./PasswordInput";

const PASSWORD_HINT_ID = "register-password-description";

type TextField = Exclude<keyof RegisterInput, "documentType" | "acceptTerms" | "marketingOptIn">;

const INITIAL_VALUES: RegisterInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  documentType: "dni",
  documentNumber: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  marketingOptIn: false,
};

export function RegisterForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [serverError, setServerError] = useState<string | null>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    registerSchema,
    INITIAL_VALUES,
  );
  const isDni = values.documentType === "dni";

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      signIn(await register(data));
      router.replace("/");
    } catch (error) {
      setServerError(error instanceof AuthError ? error.message : GENERIC_ERROR);
    }
  });

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: TextField) => ({
    id: `register-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `register-${name}-error` : undefined,
  });

  const fieldError = (name: keyof RegisterInput) => (
    <FieldError id={`register-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    <Card className="w-full max-w-lg rounded-2xl sm:[--card-spacing:--spacing(8)]">
      <CardHeader>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Crear cuenta</h1>
        <CardDescription className="text-base">
          Regístrate para comprar entradas de forma rápida y segura.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form noValidate onSubmit={onSubmit}>
          <FieldGroup>
            {serverError && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertTitle>{serverError}</AlertTitle>
              </Alert>
            )}

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="register-firstName">Nombres</FieldLabel>
                <Input {...textProps("firstName")} autoComplete="given-name" className="h-11" />
                {fieldError("firstName")}
              </Field>
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="register-lastName">Apellidos</FieldLabel>
                <Input {...textProps("lastName")} autoComplete="family-name" className="h-11" />
                {fieldError("lastName")}
              </Field>
            </div>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="register-email">Correo electrónico</FieldLabel>
              <Input {...textProps("email")} type="email" autoComplete="email" className="h-11" />
              {fieldError("email")}
            </Field>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="register-phone">Celular</FieldLabel>
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
                <FieldLabel htmlFor="register-documentType">Tipo de documento</FieldLabel>
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
                    id="register-documentType"
                    className="w-full cursor-pointer data-[size=default]:h-11"
                  >
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
                <FieldLabel htmlFor="register-documentNumber">Número de documento</FieldLabel>
                <Input
                  {...textProps("documentNumber")}
                  inputMode={isDni ? "numeric" : undefined}
                  maxLength={isDni ? 8 : undefined}
                  className="h-11"
                />
                {fieldError("documentNumber")}
              </Field>
            </div>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
              <PasswordInput
                {...textProps("password")}
                autoComplete="new-password"
                aria-describedby={errors.password ? `${PASSWORD_HINT_ID} register-password-error` : PASSWORD_HINT_ID}
              />
              <FieldDescription id={PASSWORD_HINT_ID}>
                Mínimo 8 caracteres, con al menos una letra y un número.
              </FieldDescription>
              {fieldError("password")}
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="register-confirmPassword">Confirmar contraseña</FieldLabel>
              <PasswordInput {...textProps("confirmPassword")} autoComplete="new-password" />
              {fieldError("confirmPassword")}
            </Field>

            <Field orientation="horizontal" data-invalid={!!errors.acceptTerms}>
              <Checkbox
                id="register-acceptTerms"
                checked={values.acceptTerms}
                onCheckedChange={(checked) => {
                  setValue("acceptTerms", checked);
                  handleBlur("acceptTerms");
                }}
                aria-invalid={!!errors.acceptTerms}
                aria-describedby={errors.acceptTerms ? "register-acceptTerms-error" : undefined}
              />
              <FieldContent>
                <FieldLabel htmlFor="register-acceptTerms" className="block font-normal">
                  Acepto los{" "}
                  <Link href="/terminos" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                    Términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
                    Política de privacidad
                  </Link>
                </FieldLabel>
                {fieldError("acceptTerms")}
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="register-marketingOptIn"
                checked={values.marketingOptIn}
                onCheckedChange={(checked) => setValue("marketingOptIn", checked)}
              />
              <FieldLabel htmlFor="register-marketingOptIn" className="font-normal">
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
                  Creando cuenta…
                </>
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className={cn(TEXT_LINK, "font-semibold")}>
            Iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
