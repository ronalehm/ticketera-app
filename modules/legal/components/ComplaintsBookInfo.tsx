import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LEGAL_PROVIDER } from "../data/legalProvider";
import { COMPLAINT_TYPE_DEFINITIONS, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPES } from "../schemas/complaint.schema";

const PROVIDER_ROWS = [
  { label: "Razón social", value: LEGAL_PROVIDER.businessName },
  { label: "RUC", value: LEGAL_PROVIDER.ruc },
  { label: "Dirección", value: LEGAL_PROVIDER.address },
];

const NOTES = [
  "Responderemos en un plazo máximo de quince (15) días hábiles.",
  "La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.",
  "La fecha y el número de hoja se asignan al enviar.",
];

const CARD_CLASS = "rounded-2xl ring-border";
const TITLE_CLASS = "text-lg font-bold tracking-tight";
const ROW_CLASS = "grid gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4";

/** Información del Libro de Reclamaciones: datos del proveedor, definiciones de reclamo y queja, y notas. No se imprime. */
export function ComplaintsBookInfo() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 print:hidden">
      <Card className={CARD_CLASS} aria-labelledby="complaints-provider-title" role="region">
        <CardHeader>
          <h2 id="complaints-provider-title" className={TITLE_CLASS}>
            Datos del proveedor
          </h2>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-base">
            {PROVIDER_ROWS.map(({ label, value }) => (
              <div key={label} className={ROW_CLASS}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className={CARD_CLASS} aria-labelledby="complaints-types-title" role="region">
        <CardHeader>
          <h2 id="complaints-types-title" className={TITLE_CLASS}>
            Reclamo y queja
          </h2>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-base">
            {COMPLAINT_TYPES.map((type) => (
              <div key={type} className={ROW_CLASS}>
                <dt className="font-semibold">{COMPLAINT_TYPE_LABELS[type]}</dt>
                <dd className="leading-relaxed text-muted-foreground">{COMPLAINT_TYPE_DEFINITIONS[type]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
