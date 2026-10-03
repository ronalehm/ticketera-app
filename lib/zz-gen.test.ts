// @vitest-environment node
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { buildTicketsPdf } from "@/lib/ticketPdf";
it("gen", async () => {
  const blob = await buildTicketsPdf({ orderCode: "MT-7Q4K2P", event: { title: "Noche de Sintetizadores: Gira Neón 2026 con un título muy largo que debería envolver en dos líneas", dateLabel: "Sábado, 14 de noviembre de 2026", timeLabel: "21:00 h", venueLabel: "Estadio Nacional, Lima" }, tickets: [{ code: "MT-7Q4K2P-01", locationLabel: "Tribuna Norte · Fila B · Asiento 4 con texto extra largo", holderName: "Ana Quispe" }, { code: "MT-7Q4K2P-02", locationLabel: "General", holderName: "Carlos Quispe" }] });
  writeFileSync(process.env.OUT!, Buffer.from(await blob.arrayBuffer()));
});
