import { complaintReceiptSchema } from "../schemas/complaint.schema";
import type { ComplaintFormData, ComplaintReceipt } from "../types/legal.types";

// Simulación: no envía datos a ningún servicio. Se reemplazará por la API sin cambiar la firma.
export const MOCK_LATENCY_MS = 800;

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

const limaYearFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric" });

// Correlativo en memoria por año; empieza en 1 y se reinicia al recargar (en la API lo asigna la BD).
const countersByYear = new Map<string, number>();

export async function submitComplaint(input: ComplaintFormData, now = new Date()): Promise<ComplaintReceipt> {
  void input; // la API real lo enviará; el mock no guarda ni registra datos personales
  await wait();
  const year = limaYearFormatter.format(now);
  const sequence = (countersByYear.get(year) ?? 0) + 1;
  countersByYear.set(year, sequence);
  return complaintReceiptSchema.parse({
    code: `LR-${year}-${String(sequence).padStart(6, "0")}`,
    submittedAt: now.toISOString(),
  });
}
