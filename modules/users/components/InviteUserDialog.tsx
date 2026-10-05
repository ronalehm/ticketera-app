"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useZodForm } from "@/hooks/useZodForm";
import { cn } from "@/lib/utils";
import { getPanelRoleLabel } from "@/modules/panel";

import { useInviteUser } from "../hooks/useUsers";
import { INVITABLE_ROLES, inviteUserSchema } from "../schemas/users.schema";
import type { InvitableRole, InviteOutcome, InviteUserFormValues, UserRole } from "../types/users.types";
import { getAssignRoleBlockReason } from "../utils/manageBlockReason";
import { GENERIC_ERROR } from "../utils/userManagementError";
import { DIALOG_BUTTON_CLASS, DIALOG_FOOTER_CLASS, DIALOG_SELECT_CLASS } from "./dialogStyles";

type InviteUserDialogProps = {
  actor: { id: string; role: UserRole };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Invitación hecha (o rol cambiado si ya tenía cuenta), con el correo normalizado. */
  onInvited: (result: { email: string; role: InvitableRole; outcome: InviteOutcome }) => void;
};

/** "Invitar usuario": correo y rol (Administrador solo si el actor puede asignarlo). */
export function InviteUserDialog({ actor, open, onOpenChange, onInvited }: InviteUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Invitar usuario</DialogTitle>
          <DialogDescription className="text-base">
            Si el correo ya tiene cuenta, se cambia su rol. Si no, recibe una invitación.
          </DialogDescription>
        </DialogHeader>
        {/* Dentro del popup: se desmonta al cerrar y el formulario empieza vacío cada vez. */}
        <InviteUserForm actor={actor} onInvited={onInvited} />
      </DialogContent>
    </Dialog>
  );
}

const INITIAL_VALUES: InviteUserFormValues = { email: "", role: "organizer" };

function InviteUserForm({ actor, onInvited }: Pick<InviteUserDialogProps, "actor" | "onInvited">) {
  const id = useId();
  const invite = useInviteUser(actor.id);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    inviteUserSchema,
    INITIAL_VALUES,
  );
  const roles = INVITABLE_ROLES.filter((role) => getAssignRoleBlockReason(actor, role) === null);

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    setServerFieldErrors({});
    try {
      const result = await invite.mutateAsync(data);
      if (result.ok) {
        onInvited({ email: data.email, role: data.role, outcome: result.outcome });
        return;
      }
      if (result.fieldErrors) setServerFieldErrors(result.fieldErrors);
      else setServerError(result.error);
    } catch {
      setServerError(GENERIC_ERROR);
    }
  });

  const emailError = errors.email ?? serverFieldErrors.email?.[0];
  const roleError = errors.role ?? serverFieldErrors.role?.[0];

  return (
    <form noValidate onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        {serverError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>{serverError}</AlertTitle>
          </Alert>
        )}
        <Field data-invalid={!!emailError}>
          <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="off"
            maxLength={254}
            value={values.email}
            onChange={(event) => setValue("email", event.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? `${id}-email-error` : undefined}
            className="h-11"
          />
          <FieldError id={`${id}-email-error`}>{emailError}</FieldError>
        </Field>
        <Field data-invalid={!!roleError}>
          <FieldLabel htmlFor={`${id}-role`}>Rol</FieldLabel>
          <NativeSelect
            id={`${id}-role`}
            value={values.role}
            onChange={(event) => setValue("role", event.target.value as InvitableRole)}
            aria-invalid={!!roleError}
            aria-describedby={roleError ? `${id}-role-error` : undefined}
            className={DIALOG_SELECT_CLASS}
          >
            {roles.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {getPanelRoleLabel(role)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError id={`${id}-role-error`}>{roleError}</FieldError>
        </Field>
      </FieldGroup>
      <DialogFooter className={cn(DIALOG_FOOTER_CLASS, "mt-5")}>
        <DialogClose disabled={isSubmitting} render={<Button variant="outline" className={DIALOG_BUTTON_CLASS} />}>
          Cancelar
        </DialogClose>
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(DIALOG_BUTTON_CLASS, "duration-200 hover:bg-primary-strong")}
        >
          {isSubmitting && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {isSubmitting ? "Enviando…" : "Enviar invitación"}
        </Button>
      </DialogFooter>
    </form>
  );
}
