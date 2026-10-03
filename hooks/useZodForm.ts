"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { z } from "zod";

type FieldErrors<TValues> = Partial<Record<keyof TValues, string>>;

/** First message per top-level field. */
function toFieldErrors<TValues>(error: z.ZodError): FieldErrors<TValues> {
  const errors: FieldErrors<TValues> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof TValues | undefined;
    if (key !== undefined && errors[key] === undefined) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Controlled form state validated with a zod object schema.
 * Errors appear on submit; after the first attempt, `handleBlur` revalidates a single field
 * (running the whole schema, so cross-field refinements see current values).
 */
export function useZodForm<TSchema extends z.ZodObject>(
  schema: TSchema,
  initialValues: z.input<TSchema>,
) {
  type Values = z.input<TSchema>;

  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<Values>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Latest values, readable right after setValue in the same handler (e.g. Select/Checkbox change + revalidate).
  const valuesRef = useRef<Values>(initialValues);
  const submittedRef = useRef(false);
  const formToFocusRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    formToFocusRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    formToFocusRef.current = null;
  }, [errors]);

  function setValue<K extends keyof Values>(name: K, value: Values[K]) {
    valuesRef.current = { ...valuesRef.current, [name]: value };
    setValues(valuesRef.current);
  }

  function handleBlur(name: keyof Values) {
    if (!submittedRef.current) return;
    const result = schema.safeParse(valuesRef.current);
    const message = result.success ? undefined : toFieldErrors<Values>(result.error)[name];
    setErrors((prev) => ({ ...prev, [name]: message }));
  }

  function handleSubmit(onValid: (data: z.output<TSchema>) => Promise<void>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submittedRef.current = true;
      const result = schema.safeParse(valuesRef.current);
      if (!result.success) {
        formToFocusRef.current = event.currentTarget;
        setErrors(toFieldErrors<Values>(result.error));
        return;
      }
      setErrors({});
      setIsSubmitting(true);
      void (async () => {
        try {
          await onValid(result.data);
        } finally {
          setIsSubmitting(false);
        }
      })();
    };
  }

  return { values, errors, isSubmitting, setValue, handleBlur, handleSubmit };
}
