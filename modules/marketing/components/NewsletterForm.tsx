"use client";

import { useState } from "react";
import { CircleCheck, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { newsletterSchema } from "../schemas/newsletter.schema";
import { subscribeToNewsletter } from "../services/newsletter.service";

export function NewsletterForm() {
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(newsletterSchema, {
    email: "",
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setSubscribedEmail(null);
    await subscribeToNewsletter(email);
    setSubscribedEmail(email);
  });

  return (
    <form noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field data-invalid={!!errors.email} className="sm:w-auto">
          <FieldLabel htmlFor="newsletter-email" className="sr-only">
            Correo electrónico
          </FieldLabel>
          <InputGroup className="h-12 w-full bg-background sm:w-80 lg:w-90">
            <InputGroupAddon>
              <Mail aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="newsletter-email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={values.email}
              onChange={(event) => {
                setValue("email", event.target.value);
                setSubscribedEmail(null);
              }}
              onBlur={() => handleBlur("email")}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "newsletter-email-error" : undefined}
              className="h-full"
            />
          </InputGroup>
          <FieldError id="newsletter-email-error">{errors.email}</FieldError>
        </Field>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Spinner aria-hidden className="motion-reduce:animate-none" />
              Suscribiendo…
            </>
          ) : (
            "Suscribirme"
          )}
        </Button>
      </div>
      <p role="status" className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {subscribedEmail && (
          <>
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
            ¡Listo! Te enviaremos las novedades a {subscribedEmail}.
          </>
        )}
      </p>
    </form>
  );
}
