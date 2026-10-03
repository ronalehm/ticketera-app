import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadTicketsPdf } from "@/lib/ticketPdf";
import type { TicketPdfInput } from "@/lib/ticketPdf";
import { TicketsPdfButton } from "./TicketsPdfButton";

vi.mock("@/lib/ticketPdf", () => ({ downloadTicketsPdf: vi.fn() }));

const input: TicketPdfInput = {
  orderCode: "MT-7Q4K2P",
  event: {
    title: "Noche de Sintetizadores: Gira Neón 2026",
    dateLabel: "Sábado, 14 de noviembre de 2026",
    timeLabel: "21:00 h",
    venueLabel: "Estadio Nacional, Lima",
  },
  tickets: [{ code: "MT-7Q4K2P-01", locationLabel: "General", holderName: "Ana Quispe" }],
};

const ERROR_MESSAGE = "No pudimos generar el PDF. Inténtalo de nuevo.";

/** Hace que la próxima llamada a `downloadTicketsPdf` quede pendiente hasta resolverla o rechazarla. */
function deferDownload() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  vi.mocked(downloadTicketsPdf).mockImplementationOnce(
    () =>
      new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return {
    resolve: () => act(async () => resolve()),
    reject: () => act(async () => reject(new Error("chunk"))),
  };
}

const renderButton = (props: Partial<Parameters<typeof TicketsPdfButton>[0]> = {}) => {
  render(<TicketsPdfButton input={input} errorClassName="col-span-2" {...props} />);
  return screen.getByRole("button");
};

afterEach(() => {
  cleanup();
  vi.mocked(downloadTicketsPdf).mockReset();
});

describe("TicketsPdfButton", () => {
  it("en reposo muestra 'Descargar PDF' sin aria-busy ni aria-disabled y con el estado vacío", () => {
    const button = renderButton();

    expect(button.textContent).toBe("Descargar PDF");
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mientras genera, bloquea el botón, conserva el foco y anuncia el progreso", async () => {
    const download = deferDownload();
    const button = renderButton();
    button.focus();

    fireEvent.click(button);

    expect(downloadTicketsPdf).toHaveBeenCalledTimes(1);
    expect(downloadTicketsPdf).toHaveBeenCalledWith(input);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.textContent).toBe("Generando…");
    expect(screen.getByRole("status").textContent).toBe("Generando PDF…");

    fireEvent.click(button);
    expect(downloadTicketsPdf).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);

    await download.resolve();
  });

  it("al terminar vuelve a 'Descargar PDF' y vacía el estado", async () => {
    const download = deferDownload();
    const button = renderButton();

    fireEvent.click(button);
    await download.resolve();

    expect(button.textContent).toBe("Descargar PDF");
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si falla, muestra el error recuperable y un nuevo clic lo quita y vuelve a intentar", async () => {
    const failed = deferDownload();
    const button = renderButton();

    fireEvent.click(button);
    await failed.reject();

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(ERROR_MESSAGE);
    expect(alert.classList.contains("col-span-2")).toBe(true);
    expect(alert.classList.contains("text-destructive")).toBe(true);
    expect(button.textContent).toBe("Descargar PDF");
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);

    const retry = deferDownload();
    fireEvent.click(button);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(downloadTicketsPdf).toHaveBeenCalledTimes(2);

    await retry.resolve();
  });

  it("reenvía className y variant al botón", () => {
    const button = renderButton({ className: "h-11 custom-action", variant: "outline" });

    expect(button.classList.contains("custom-action")).toBe(true);
    expect(button.classList.contains("h-11")).toBe(true);
    expect(button.classList.contains("border-border")).toBe(true);
  });
});
