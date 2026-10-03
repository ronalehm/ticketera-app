import Link from "next/link";
import { CircleCheck, Printer } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DOCUMENT_TYPE_LABELS } from "@/lib/formFields";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/format";
import { LEGAL_PROVIDER_ROWS } from "../data/legalProvider";
import { COMPLAINT_ITEM_TYPE_LABELS, COMPLAINT_TYPE_LABELS } from "../schemas/complaint.schema";
import type { ComplaintFormData, ComplaintReceipt } from "../types/legal.types";
import { formatLegalDate } from "../utils/formatLegalDate";

/** Id del h2 de la confirmación: `ComplaintForm` le mueve el foco tras el envío. */
export const COMPLAINT_CONFIRMATION_TITLE_ID = "complaint-confirmation-title";

const ACTION_CLASS =
  "h-11 cursor-pointer gap-2 px-4 font-semibold duration-200 sm:px-6 [&_svg:not([class*='size-'])]:size-5";

type SummaryRow = { label: string; value: string };
type SummaryGroup = { title: string; rows: SummaryRow[] };

function getSummaryGroups(data: ComplaintFormData): SummaryGroup[] {
  const groups: SummaryGroup[] = [
    {
      title: "Proveedor",
      rows: LEGAL_PROVIDER_ROWS,
    },
    {
      title: "Datos del consumidor",
      rows: [
        { label: "Nombres", value: data.firstName },
        { label: "Apellidos", value: data.lastName },
        { label: "Documento", value: `${DOCUMENT_TYPE_LABELS[data.documentType]} ${data.documentNumber}` },
        { label: "Domicilio", value: data.address },
        { label: "Celular", value: `+51 ${data.phone}` },
        { label: "Correo electrónico", value: data.email },
        { label: "Menor de edad", value: data.isMinor ? "Sí" : "No" },
      ],
    },
  ];

  if (data.isMinor) {
    groups.push({
      title: "Datos del padre, madre o apoderado",
      rows: [
        { label: "Nombres", value: data.guardianFirstName },
        { label: "Apellidos", value: data.guardianLastName },
        {
          label: "Documento",
          value: `${DOCUMENT_TYPE_LABELS[data.guardianDocumentType]} ${data.guardianDocumentNumber}`,
        },
      ],
    });
  }

  groups.push(
    {
      title: "Bien contratado",
      rows: [
        { label: "Tipo", value: COMPLAINT_ITEM_TYPE_LABELS[data.itemType] },
        ...(data.amount === null ? [] : [{ label: "Monto reclamado", value: formatEventPrice(data.amount) }]),
        { label: "Descripción", value: data.itemDescription },
      ],
    },
    {
      title: "Detalle de la reclamación",
      rows: [
        { label: "Tipo", value: COMPLAINT_TYPE_LABELS[data.complaintType] },
        { label: "Detalle", value: data.detail },
        { label: "Pedido", value: data.request },
      ],
    },
  );

  return groups;
}

type ComplaintConfirmationProps = {
  receipt: ComplaintReceipt;
  data: ComplaintFormData;
};

/** Hoja de reclamación registrada: código, fecha, plazo de respuesta y resumen imprimible. Solo la usa `ComplaintForm` (cliente). */
export function ComplaintConfirmation({ receipt, data }: ComplaintConfirmationProps) {
  const typeLabel = COMPLAINT_TYPE_LABELS[data.complaintType].toLowerCase();

  return (
    <section
      aria-labelledby={COMPLAINT_CONFIRMATION_TITLE_ID}
      className="flex flex-col gap-6 rounded-2xl bg-card p-5 text-card-foreground ring-1 ring-border md:gap-8 md:p-8 print:p-0 print:ring-0"
    >
      <header className="flex flex-col items-start gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary print:hidden">
          <CircleCheck aria-hidden className="size-6" />
        </span>
        <h2
          id={COMPLAINT_CONFIRMATION_TITLE_ID}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-bold tracking-tight outline-none md:text-3xl"
        >
          Registramos tu {typeLabel}
        </h2>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">
            Hoja de reclamación N.° <span className="tabular-nums">{receipt.code}</span>
          </p>
          <p className="text-muted-foreground">
            Fecha: <time dateTime={receipt.submittedAt}>{formatLegalDate(receipt.submittedAt)}</time>
          </p>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Responderemos en un plazo máximo de 15 días hábiles a{" "}
          <strong className="font-semibold break-all text-foreground">{data.email}</strong>.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {getSummaryGroups(data).map((group) => (
          <div key={group.title} className="flex flex-col gap-3 border-t pt-5 print:break-inside-avoid">
            <h3 className="text-base font-bold">{group.title}</h3>
            <dl className="flex flex-col gap-3">
              {group.rows.map(({ label, value }) => (
                <div key={label} className="grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-words whitespace-pre-line">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* print:hidden en un contenedor sin display propio para no competir con sm:flex-row. */}
      <div className="print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className={cn(ACTION_CLASS, "text-primary-strong hover:bg-accent hover:text-primary-strong")}
          >
            <Printer aria-hidden />
            Imprimir hoja
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost" }), ACTION_CLASS, "text-primary-strong hover:text-primary-strong")}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
