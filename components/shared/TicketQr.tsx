import { create } from "qrcode";
import { cn } from "@/lib/utils";

/** Zona tranquila (módulos claros) alrededor del símbolo dentro del `viewBox`. */
const QR_MARGIN = 2;

/** Matriz del QR real de `value` (corrección de errores M); `true` = módulo oscuro. */
export function getQrModules(value: string): boolean[][] {
  const { modules } = create(value, { errorCorrectionLevel: "M" });
  return Array.from({ length: modules.size }, (_, row) =>
    Array.from({ length: modules.size }, (_, col) => modules.get(row, col) === 1),
  );
}

/** QR de una entrada. `value` es su `qr_token` (lo único que se codifica); `ticketCode` solo se anuncia. */
export function TicketQr({
  value,
  ticketCode,
  className,
}: {
  value: string;
  ticketCode: string;
  className?: string;
}) {
  const modules = getQrModules(value);
  const path = modules
    .flatMap((cells, row) => cells.flatMap((dark, col) => (dark ? [`M${col} ${row}h1v1h-1z`] : [])))
    .join("");
  const side = modules.length + QR_MARGIN * 2;

  return (
    <svg
      viewBox={`${-QR_MARGIN} ${-QR_MARGIN} ${side} ${side}`}
      role="img"
      aria-label={`Código QR de la entrada ${ticketCode}`}
      shapeRendering="crispEdges"
      className={cn("bg-background text-foreground", className)}
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}
