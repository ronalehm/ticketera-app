import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const STATUS_TEXT = {
  pending: "pendiente de aprobación",
  suspended: "suspendida",
} as const;

type PanelReadOnlyNoticeProps = {
  /** Estado del organizador no aprobado; `null` si aún no tiene fila en `organizers`. */
  status: keyof typeof STATUS_TEXT | null;
  className?: string;
};

// Aviso del layout para un organizador no aprobado: el panel queda en solo lectura.
export function PanelReadOnlyNotice({ status, className }: PanelReadOnlyNoticeProps) {
  return (
    <Alert className={cn("mb-6 px-4 py-3", className)}>
      <Info aria-hidden />
      <AlertTitle className="font-semibold">
        {status === null
          ? "Tu cuenta de organizador aún no está dada de alta"
          : `Tu cuenta de organizador está ${STATUS_TEXT[status]}`}
      </AlertTitle>
      <AlertDescription>Puedes ver tu panel, pero no crear ni editar eventos.</AlertDescription>
    </Alert>
  );
}
