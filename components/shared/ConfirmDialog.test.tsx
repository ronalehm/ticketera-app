import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

afterEach(cleanup);

function renderDialog(props: Partial<ConfirmDialogProps> = {}) {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn<() => Promise<string | null>>().mockResolvedValue(null);
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="¿Enviar «Festival» a revisión?"
      description="Un administrador lo revisará."
      confirmLabel="Enviar a revisión"
      pendingLabel="Enviando…"
      onConfirm={onConfirm}
      genericError="No pudimos completar la solicitud."
      {...props}
    />,
  );
  return { dialog: screen.getByRole("alertdialog"), onOpenChange, onConfirm: props.onConfirm ?? onConfirm };
}

describe("ConfirmDialog", () => {
  it("muestra el título y la descripción como nombre y descripción accesibles del diálogo", () => {
    const { dialog } = renderDialog();
    expect(screen.getByRole("alertdialog", { name: "¿Enviar «Festival» a revisión?" })).toBe(dialog);
    expect(within(dialog).getByText("Un administrador lo revisará.")).toBeTruthy();
  });

  it("confirmar ejecuta la acción; mientras tanto ambos botones se deshabilitan y se ve el texto de carga", async () => {
    let resolve!: (value: string | null) => void;
    const onConfirm = vi.fn(() => new Promise<string | null>((done) => (resolve = done)));
    const { dialog } = renderDialog({ onConfirm });

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const pending = within(dialog).getByRole("button", { name: "Enviando…" });
    expect(pending.hasAttribute("disabled")).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")).toBe(true);

    await act(async () => resolve(null));
    expect(within(dialog).getByRole("button", { name: "Enviar a revisión" }).hasAttribute("disabled")).toBe(false);
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("si la acción devuelve un error, lo muestra y se puede reintentar", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce("El evento ya no está en revisión.").mockResolvedValueOnce(null);
    const { dialog } = renderDialog({ onConfirm });

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("El evento ya no está en revisión.");

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));
    await waitFor(() => expect(within(dialog).queryByRole("alert")).toBeNull());
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("si la acción lanza, muestra el mensaje genérico", async () => {
    const { dialog } = renderDialog({ onConfirm: vi.fn().mockRejectedValue(new Error("red")) });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("No pudimos completar la solicitud.");
  });

  it("el botón de cancelar (con su texto) cierra sin ejecutar la acción", () => {
    const { dialog, onOpenChange, onConfirm } = renderDialog({ cancelLabel: "Volver" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("destructive pinta la acción en rojo con texto navy", () => {
    const { dialog } = renderDialog({ destructive: true, confirmLabel: "Eliminar" });
    expect(within(dialog).getByRole("button", { name: "Eliminar" }).className).toContain("bg-destructive text-foreground");
  });
});
