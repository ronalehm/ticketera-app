"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import { getPanelRoleLabel } from "@/modules/panel";

import { ORGANIZER_STATUS_BADGE } from "../data/userBadges";
import { useUpdateUser } from "../hooks/useUsers";
import { updateUserSchema } from "../schemas/users.schema";
import type {
  TaxIdType,
  UpdateUserFormValues,
  UserListItem,
  UserOrganizerStatus,
  UserRole,
} from "../types/users.types";
import { getAssignRoleBlockReason } from "../utils/manageBlockReason";
import { GENERIC_ERROR } from "../utils/userManagementError";
import { DIALOG_BUTTON_CLASS, DIALOG_FOOTER_CLASS, DIALOG_SELECT_CLASS } from "./dialogStyles";

/** Roles del selector, en este orden; solo los que el actor puede asignar (`super_admin` nunca). */
const EDITABLE_ROLES = ["customer", "organizer", "admin"] as const satisfies readonly UserRole[];

const TAX_ID_TYPE_LABELS: Record<TaxIdType, string> = { ruc: "RUC", dni: "DNI" };
const TAX_ID_MAX_LENGTH: Record<TaxIdType, number> = { ruc: 11, dni: 8 };

type Actor = { id: string; role: UserRole };

type EditUserDialogProps = {
  actor: Actor;
  /** Usuario que se edita; se conserva al cerrar para la animación de salida. */
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cambios guardados; `name` es el nombre visible ya actualizado. */
  onSaved: (name: string) => void;
};

/** "Editar usuario": nombres, rol y, con rol organizador, sus datos fiscales y su estado. El correo no se edita. */
export function EditUserDialog({ actor, user, open, onOpenChange, onSaved }: EditUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto p-5 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Editar usuario</DialogTitle>
        </DialogHeader>
        {/* Dentro del popup: se desmonta al cerrar y cada apertura parte de los datos del usuario. */}
        {user && <EditUserForm actor={actor} user={user} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

type EditValues = {
  firstName: string;
  lastName: string;
  role: UserRole;
  legalName: string;
  taxIdType: TaxIdType | "";
  taxId: string;
  organizerStatus: UserOrganizerStatus;
};

function getInitialValues(user: UserListItem): EditValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    legalName: user.legalName ?? "",
    taxIdType: user.taxIdType ?? "",
    taxId: user.taxId ?? "",
    // Quien pasa a ser organizador empieza pendiente (aunque conserve una fila antigua `suspended`).
    organizerStatus: user.role === "organizer" ? (user.organizerStatus ?? "pending") : "pending",
  };
}

/** Entrada de `updateUserAction`: los datos de organizador solo con el rol organizer. */
function toUpdateInput(values: EditValues): UpdateUserFormValues {
  const { firstName, lastName, role } = values;
  if (role !== "organizer") return { firstName, lastName, role };
  return {
    firstName,
    lastName,
    role,
    organizer: {
      legalName: values.legalName,
      taxIdType: values.taxIdType || null,
      taxId: values.taxId,
      status: values.organizerStatus,
    },
  };
}

type FieldErrors = Record<string, string | undefined>;

/** Primer mensaje por ruta (`firstName`, `organizer.taxId`…), igual que los `fieldErrors` de la acción. */
function toFieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    errors[path] ??= issue.message;
  }
  return errors;
}

function EditUserForm({ actor, user, onSaved }: Pick<EditUserDialogProps, "actor" | "onSaved"> & { user: UserListItem }) {
  const id = useId();
  const update = useUpdateUser(actor.id);
  const [values, setValues] = useState<EditValues>(() => getInitialValues(user));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusInvalidRef = useRef(false);
  const roles = EDITABLE_ROLES.filter((role) => getAssignRoleBlockReason(actor, role) === null);
  const isOrganizer = values.role === "organizer";

  // Tras un envío con errores, el foco va al primer campo inválido.
  useEffect(() => {
    if (!focusInvalidRef.current) return;
    focusInvalidRef.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function setValue<K extends keyof EditValues>(name: K, value: EditValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function showErrors(next: FieldErrors) {
    focusInvalidRef.current = true;
    setErrors(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const input = toUpdateInput(values);
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      showErrors(toFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    try {
      const result = await update.mutateAsync({ id: user.id, values: input });
      if (result.ok) {
        onSaved(getFullName(parsed.data.firstName, parsed.data.lastName) || user.email);
        return;
      }
      if (result.fieldErrors) {
        showErrors(Object.fromEntries(Object.entries(result.fieldErrors).map(([path, [message]]) => [path, message])));
      } else {
        setServerError(result.error);
      }
    } catch {
      setServerError(GENERIC_ERROR);
    }
  }

  /** Props de accesibilidad y error de un campo por su ruta. */
  const fieldProps = (path: string) => ({
    id: `${id}-${path}`,
    "aria-invalid": !!errors[path],
    "aria-describedby": errors[path] ? `${id}-${path}-error` : undefined,
  });
  const fieldError = (path: string) => <FieldError id={`${id}-${path}-error`}>{errors[path]}</FieldError>;

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        {serverError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>{serverError}</AlertTitle>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor={`${id}-firstName`}>Nombre</FieldLabel>
            <Input
              {...fieldProps("firstName")}
              autoComplete="off"
              maxLength={50}
              value={values.firstName}
              onChange={(event) => setValue("firstName", event.target.value)}
              className="h-11"
            />
            {fieldError("firstName")}
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor={`${id}-lastName`}>Apellido</FieldLabel>
            <Input
              {...fieldProps("lastName")}
              autoComplete="off"
              maxLength={50}
              value={values.lastName}
              onChange={(event) => setValue("lastName", event.target.value)}
              className="h-11"
            />
            {fieldError("lastName")}
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
          <Input
            id={`${id}-email`}
            value={user.email}
            disabled
            aria-describedby={`${id}-email-description`}
            className="h-11"
          />
          <FieldDescription id={`${id}-email-description`}>El correo viene de la cuenta y no se edita.</FieldDescription>
        </Field>
        <Field data-invalid={!!errors.role}>
          <FieldLabel htmlFor={`${id}-role`}>Rol</FieldLabel>
          <NativeSelect
            {...fieldProps("role")}
            value={values.role}
            onChange={(event) => setValue("role", event.target.value as UserRole)}
            className={DIALOG_SELECT_CLASS}
          >
            {roles.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {getPanelRoleLabel(role)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("role")}
        </Field>

        {isOrganizer && (
          <FieldSet className="gap-4 rounded-xl bg-muted p-4">
            <FieldLegend className="text-base font-bold">Datos del organizador</FieldLegend>
            <Field data-invalid={!!errors["organizer.legalName"]}>
              <FieldLabel htmlFor={`${id}-organizer.legalName`}>Razón social</FieldLabel>
              <Input
                {...fieldProps("organizer.legalName")}
                autoComplete="off"
                maxLength={200}
                value={values.legalName}
                onChange={(event) => setValue("legalName", event.target.value)}
                className="h-11 bg-background"
              />
              {fieldError("organizer.legalName")}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors["organizer.taxIdType"]}>
                <FieldLabel htmlFor={`${id}-organizer.taxIdType`}>Tipo de documento fiscal</FieldLabel>
                <NativeSelect
                  {...fieldProps("organizer.taxIdType")}
                  value={values.taxIdType}
                  onChange={(event) => setValue("taxIdType", event.target.value as EditValues["taxIdType"])}
                  className={cn(DIALOG_SELECT_CLASS, "*:data-[slot=native-select]:bg-background")}
                >
                  <NativeSelectOption value="">Elige el tipo</NativeSelectOption>
                  {(Object.keys(TAX_ID_TYPE_LABELS) as TaxIdType[]).map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {TAX_ID_TYPE_LABELS[type]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldError("organizer.taxIdType")}
              </Field>
              <Field data-invalid={!!errors["organizer.taxId"]}>
                <FieldLabel htmlFor={`${id}-organizer.taxId`}>RUC/DNI</FieldLabel>
                <Input
                  {...fieldProps("organizer.taxId")}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={values.taxIdType ? TAX_ID_MAX_LENGTH[values.taxIdType] : 20}
                  value={values.taxId}
                  onChange={(event) => setValue("taxId", event.target.value)}
                  className="h-11 bg-background"
                />
                {fieldError("organizer.taxId")}
              </Field>
            </div>
            <Field data-invalid={!!errors["organizer.status"]}>
              <FieldLabel htmlFor={`${id}-organizer.status`}>Estado de organizador</FieldLabel>
              <NativeSelect
                {...fieldProps("organizer.status")}
                aria-describedby={
                  errors["organizer.status"]
                    ? `${id}-organizer.status-help ${id}-organizer.status-error`
                    : `${id}-organizer.status-help`
                }
                value={values.organizerStatus}
                onChange={(event) => setValue("organizerStatus", event.target.value as UserOrganizerStatus)}
                className={cn(DIALOG_SELECT_CLASS, "*:data-[slot=native-select]:bg-background")}
              >
                {(Object.keys(ORGANIZER_STATUS_BADGE) as UserOrganizerStatus[]).map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {ORGANIZER_STATUS_BADGE[status].label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription id={`${id}-organizer.status-help`}>
                Para aprobar hacen falta la razón social, el tipo y el número fiscal.
              </FieldDescription>
              {fieldError("organizer.status")}
            </Field>
          </FieldSet>
        )}
      </FieldGroup>
      <DialogFooter className={cn(DIALOG_FOOTER_CLASS, "mt-5")}>
        <DialogClose disabled={update.isPending} render={<Button variant="outline" className={DIALOG_BUTTON_CLASS} />}>
          Cancelar
        </DialogClose>
        <Button
          type="submit"
          disabled={update.isPending}
          className={cn(DIALOG_BUTTON_CLASS, "duration-200 hover:bg-primary-strong")}
        >
          {update.isPending && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {update.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
