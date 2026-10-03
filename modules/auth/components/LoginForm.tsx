"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { TEXT_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { loginSchema } from "../schemas/auth.schema";
import { AuthError, login } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import { GENERIC_ERROR } from "./formShared";
import { GoogleSignIn } from "./GoogleSignIn";
import { PasswordInput } from "./PasswordInput";

export function LoginForm() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [serverError, setServerError] = useState<string | null>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(loginSchema, {
    email: "",
    password: "",
  });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      signIn(await login(data));
      router.replace("/");
    } catch (error) {
      setServerError(error instanceof AuthError ? error.message : GENERIC_ERROR);
    }
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Hola de nuevo</h1>
        <p className="text-base text-muted-foreground">Ingresa para ver tus entradas y comprar más rápido.</p>
      </div>

      <GoogleSignIn />
      <FieldSeparator>o</FieldSeparator>

      <form noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {serverError && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>{serverError}</AlertTitle>
            </Alert>
          )}

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="h-11"
              value={values.email}
              onChange={(event) => setValue("email", event.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />
            <FieldError id="login-email-error">{errors.email}</FieldError>
          </Field>

          <Field data-invalid={!!errors.password}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              {/* Área táctil asimétrica: el input queda a 8px (gap-2) debajo; no debe solaparlo. */}
              <Link href="/recuperar-contrasena" className={cn(TEXT_LINK, "text-sm after:-top-4 after:-bottom-2")}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => setValue("password", event.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
            />
            <FieldError id="login-password-error">{errors.password}</FieldError>
          </Field>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong"
          >
            {isSubmitting ? (
              <>
                <Spinner aria-hidden className="motion-reduce:animate-none" />
                Ingresando…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className={cn(TEXT_LINK, "font-semibold")}>
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
