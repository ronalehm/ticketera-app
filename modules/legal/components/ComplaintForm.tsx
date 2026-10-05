"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/useZodForm";
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from "@/lib/formFields";
import { cn } from "@/lib/utils";
import {
  COMPLAINT_ITEM_TYPE_LABELS,
  COMPLAINT_ITEM_TYPES,
  COMPLAINT_TYPE_DEFINITIONS,
  COMPLAINT_TYPE_LABELS,
  COMPLAINT_TYPES,
  complaintFormSchema,
} from "../schemas/complaint.schema";
import { submitComplaint } from "../services/complaints.service";
import type {
  ComplaintFormData,
  ComplaintFormValues,
  ComplaintItemType,
  ComplaintReceipt,
  ComplaintType,
} from "../types/legal.types";
import { COMPLAINT_CONFIRMATION_TITLE_ID, ComplaintConfirmation } from "./ComplaintConfirmation";

const SUBMIT_ERROR = "No pudimos registrar tu hoja de reclamación. Inténtalo de nuevo.";

const INITIAL_VALUES: ComplaintFormValues = {
  firstName: "",
  lastName: "",
  documentType: "dni",
  documentNumber: "",
  address: "",
  phone: "",
  email: "",
  isMinor: false,
  guardianFirstName: "",
  guardianLastName: "",
  guardianDocumentType: "dni",
  guardianDocumentNumber: "",
  itemType: "",
  amount: "",
  itemDescription: "",
  complaintType: "",
  detail: "",
  request: "",
};

type FieldName = keyof ComplaintFormValues;
type TextField = Exclude<
  FieldName,
  "documentType" | "guardianDocumentType" | "isMinor" | "itemType" | "complaintType"
>;
type DocumentTypeField = "documentType" | "guardianDocumentType";

const GUARDIAN_FIELDS = [
  "guardianFirstName",
  "guardianLastName",
  "guardianDocumentType",
  "guardianDocumentNumber",
] as const satisfies readonly FieldName[];

const CARD_CLASS = "rounded-2xl ring-border";
const LEGEND_CLASS = "mb-0 text-lg font-bold tracking-tight";
const GRID_CLASS = "grid gap-5 sm:grid-cols-2 sm:gap-4";
const RADIO_GROUP_CLASS =
  "grid gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-2";
const RADIO_CARD_CLASS = "min-h-11 cursor-pointer has-data-checked:border-primary has-data-checked:bg-accent";

const fieldId = (name: FieldName) => `complaint-${name}`;
const errorId = (name: FieldName) => `complaint-${name}-error`;
const descriptionId = (name: FieldName) => `complaint-${name}-description`;

/** Asterisco visual de campo obligatorio (oculto a la tecnología de apoyo: lo obligatorio lo comunica `required`). */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-destructive">
      *
    </span>
  );
}

type Submission = { receipt: ComplaintReceipt; data: ComplaintFormData };

/** Hoja de reclamación del Libro de Reclamaciones: formulario en tres secciones y confirmación tras el envío. */
export function ComplaintForm() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [hasSubmitError, setHasSubmitError] = useState(false);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(
    complaintFormSchema,
    INITIAL_VALUES,
  );

  useEffect(() => {
    if (submission) document.getElementById(COMPLAINT_CONFIRMATION_TITLE_ID)?.focus();
  }, [submission]);

  const onSubmit = handleSubmit(async (data) => {
    setHasSubmitError(false);
    try {
      const receipt = await submitComplaint(data);
      setSubmission({ receipt, data });
    } catch {
      setHasSubmitError(true);
    }
  });

  if (submission) return <ComplaintConfirmation receipt={submission.receipt} data={submission.data} />;

  const describedBy = (name: FieldName, hasDescription = false) =>
    [hasDescription && descriptionId(name), errors[name] && errorId(name)].filter(Boolean).join(" ") || undefined;

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: TextField, hasDescription = false) => ({
    id: fieldId(name),
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    required: true,
    "aria-invalid": !!errors[name],
    "aria-describedby": describedBy(name, hasDescription),
  });

  const fieldError = (name: FieldName) => <FieldError id={errorId(name)}>{errors[name]}</FieldError>;

  const label = (name: FieldName, text: string, required = true) => (
    <FieldLabel htmlFor={fieldId(name)}>
      {text}
      {required && <RequiredMark />}
    </FieldLabel>
  );

  const documentTypeField = (name: DocumentTypeField, numberName: "documentNumber" | "guardianDocumentNumber") => (
    <Field>
      {label(name, "Tipo de documento")}
      <Select
        items={DOCUMENT_TYPE_LABELS}
        value={values[name]}
        onValueChange={(value) => {
          if (!value) return;
          setValue(name, value);
          handleBlur(name);
          handleBlur(numberName);
        }}
      >
        <SelectTrigger id={fieldId(name)} className="w-full cursor-pointer data-[size=default]:h-11">
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
  );

  const documentNumberField = (name: "documentNumber" | "guardianDocumentNumber", isDni: boolean) => (
    <Field data-invalid={!!errors[name]}>
      {label(name, "Número de documento")}
      <Input
        {...textProps(name)}
        inputMode={isDni ? "numeric" : undefined}
        maxLength={isDni ? 8 : undefined}
        className="h-11"
      />
      {fieldError(name)}
    </Field>
  );

  // Props del RadioGroup: nombre (título "Tipo"), obligatorio y error. `tabIndex={-1}` deja que useZodForm le
  // mueva el foco cuando es el primer campo inválido (el grupo no es enfocable por sí mismo).
  const radioGroupProps = (name: "itemType" | "complaintType") => ({
    value: values[name],
    required: true,
    tabIndex: -1,
    "aria-labelledby": `${fieldId(name)}-label`,
    "aria-invalid": !!errors[name],
    "aria-describedby": describedBy(name),
    className: RADIO_GROUP_CLASS,
  });

  const radioTitle = (name: "itemType" | "complaintType") => (
    <FieldTitle id={`${fieldId(name)}-label`}>
      Tipo
      <RequiredMark />
    </FieldTitle>
  );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      <Card className={CARD_CLASS}>
        <CardContent>
          <FieldSet className="gap-5">
            <FieldLegend className={LEGEND_CLASS}>Datos del consumidor</FieldLegend>
            <FieldDescription>Los campos con * son obligatorios.</FieldDescription>
            <div className={GRID_CLASS}>
              <Field data-invalid={!!errors.firstName}>
                {label("firstName", "Nombres")}
                <Input {...textProps("firstName")} autoComplete="given-name" className="h-11" />
                {fieldError("firstName")}
              </Field>
              <Field data-invalid={!!errors.lastName}>
                {label("lastName", "Apellidos")}
                <Input {...textProps("lastName")} autoComplete="family-name" className="h-11" />
                {fieldError("lastName")}
              </Field>
              {documentTypeField("documentType", "documentNumber")}
              {documentNumberField("documentNumber", values.documentType === "dni")}
              <Field data-invalid={!!errors.address} className="sm:col-span-2">
                {label("address", "Domicilio")}
                <Input {...textProps("address")} autoComplete="street-address" className="h-11" />
                {fieldError("address")}
              </Field>
              <Field data-invalid={!!errors.phone}>
                {label("phone", "Celular")}
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
              <Field data-invalid={!!errors.email}>
                {label("email", "Correo electrónico")}
                <Input {...textProps("email", true)} type="email" autoComplete="email" className="h-11" />
                <FieldDescription id={descriptionId("email")}>Te responderemos a este correo.</FieldDescription>
                {fieldError("email")}
              </Field>
            </div>

            <Field orientation="horizontal">
              <Checkbox
                id={fieldId("isMinor")}
                checked={values.isMinor}
                onCheckedChange={(checked) => {
                  setValue("isMinor", checked);
                  // Tras un envío, recalcula los errores del apoderado: aparecen al marcar y se limpian al desmarcar.
                  handleBlur("isMinor");
                  GUARDIAN_FIELDS.forEach((name) => handleBlur(name));
                }}
              />
              {/* min-h-11: área táctil de 44 px (la etiqueta ocupa el resto de la fila y también marca la casilla). */}
              <FieldLabel htmlFor={fieldId("isMinor")} className="min-h-11 cursor-pointer font-normal">
                Soy menor de edad
              </FieldLabel>
            </Field>

            {values.isMinor && (
              <FieldSet className="gap-4 rounded-xl bg-muted/50 p-4">
                <FieldLegend className="mb-0 text-base font-semibold">Datos del padre, madre o apoderado</FieldLegend>
                <div className={GRID_CLASS}>
                  <Field data-invalid={!!errors.guardianFirstName}>
                    {label("guardianFirstName", "Nombres")}
                    <Input {...textProps("guardianFirstName")} className="h-11" />
                    {fieldError("guardianFirstName")}
                  </Field>
                  <Field data-invalid={!!errors.guardianLastName}>
                    {label("guardianLastName", "Apellidos")}
                    <Input {...textProps("guardianLastName")} className="h-11" />
                    {fieldError("guardianLastName")}
                  </Field>
                  {documentTypeField("guardianDocumentType", "guardianDocumentNumber")}
                  {documentNumberField("guardianDocumentNumber", values.guardianDocumentType === "dni")}
                </div>
              </FieldSet>
            )}
          </FieldSet>
        </CardContent>
      </Card>

      <Card className={CARD_CLASS}>
        <CardContent>
          <FieldSet className="gap-5">
            <FieldLegend className={LEGEND_CLASS}>Bien contratado</FieldLegend>
            <Field data-invalid={!!errors.itemType}>
              {radioTitle("itemType")}
              <RadioGroup
                {...radioGroupProps("itemType")}
                onValueChange={(value: ComplaintItemType) => {
                  setValue("itemType", value);
                  handleBlur("itemType");
                }}
              >
                {COMPLAINT_ITEM_TYPES.map((option) => {
                  const id = `${fieldId("itemType")}-${option}`;
                  return (
                    <FieldLabel
                      key={option}
                      htmlFor={id}
                      className={cn(RADIO_CARD_CLASS, errors.itemType && "border-destructive")}
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem value={option} id={id} />
                        <FieldTitle className="text-base font-semibold">
                          {COMPLAINT_ITEM_TYPE_LABELS[option]}
                        </FieldTitle>
                      </Field>
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
              {fieldError("itemType")}
            </Field>
            <div className={GRID_CLASS}>
              <Field data-invalid={!!errors.amount}>
                {label("amount", "Monto reclamado (opcional)", false)}
                <InputGroup className="h-11">
                  <InputGroupAddon>
                    <InputGroupText>S/</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    {...textProps("amount")}
                    required={false}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="h-full"
                  />
                </InputGroup>
                {fieldError("amount")}
              </Field>
              <Field data-invalid={!!errors.itemDescription} className="sm:col-span-2">
                {label("itemDescription", "Descripción")}
                <Input
                  {...textProps("itemDescription")}
                  placeholder="Ej.: 2 entradas para Noche de sintetizadores, pedido TK-1042"
                  className="h-11"
                />
                {fieldError("itemDescription")}
              </Field>
            </div>
          </FieldSet>
        </CardContent>
      </Card>

      <Card className={CARD_CLASS}>
        <CardContent>
          <FieldSet className="gap-5">
            <FieldLegend className={LEGEND_CLASS}>Detalle de la reclamación</FieldLegend>
            <Field data-invalid={!!errors.complaintType}>
              {radioTitle("complaintType")}
              <RadioGroup
                {...radioGroupProps("complaintType")}
                onValueChange={(value: ComplaintType) => {
                  setValue("complaintType", value);
                  handleBlur("complaintType");
                }}
              >
                {COMPLAINT_TYPES.map((option) => {
                  const id = `${fieldId("complaintType")}-${option}`;
                  return (
                    <FieldLabel
                      key={option}
                      htmlFor={id}
                      className={cn(RADIO_CARD_CLASS, errors.complaintType && "border-destructive")}
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem
                          value={option}
                          id={id}
                          aria-labelledby={`${id}-title`}
                          aria-describedby={`${id}-description`}
                        />
                        <FieldContent>
                          <FieldTitle id={`${id}-title`} className="text-base font-semibold">
                            {COMPLAINT_TYPE_LABELS[option]}
                          </FieldTitle>
                          <FieldDescription id={`${id}-description`}>
                            {COMPLAINT_TYPE_DEFINITIONS[option]}
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
              {fieldError("complaintType")}
            </Field>
            <Field data-invalid={!!errors.detail}>
              {label("detail", "Detalle")}
              <Textarea {...textProps("detail")} rows={5} className="field-sizing-fixed resize-y" />
              {fieldError("detail")}
            </Field>
            <Field data-invalid={!!errors.request}>
              {label("request", "Pedido")}
              <Textarea {...textProps("request", true)} rows={3} className="field-sizing-fixed resize-y" />
              <FieldDescription id={descriptionId("request")}>Qué solución esperas del proveedor.</FieldDescription>
              {fieldError("request")}
            </Field>
          </FieldSet>
        </CardContent>
      </Card>

      {hasSubmitError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{SUBMIT_ERROR}</AlertTitle>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong sm:w-auto sm:self-start"
      >
        {isSubmitting ? (
          <>
            <Spinner aria-hidden className="motion-reduce:animate-none" />
            Enviando…
          </>
        ) : (
          "Enviar hoja de reclamación"
        )}
      </Button>
    </form>
  );
}
