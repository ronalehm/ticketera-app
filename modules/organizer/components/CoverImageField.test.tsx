import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { uploadPresigned } from "@vercel/blob/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoverImageField } from "./CoverImageField";

vi.mock("@vercel/blob/client", () => ({ uploadPresigned: vi.fn() }));

const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const BLOB_URL = "https://abc.public.blob.vercel-storage.com/events/draft/new.jpg";
const OLD_BLOB_URL = `https://abc.public.blob.vercel-storage.com/events/${EVENT_ID}/old.jpg`;
const EXTERNAL_URL = "https://images.unsplash.com/a.jpg";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

function setup({ value = "", eventId = null as string | null, error = undefined as string | undefined } = {}) {
  const onChange = vi.fn();
  const onUploadingChange = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState(value);
    return (
      <CoverImageField
        id="cover"
        eventId={eventId}
        value={current}
        onChange={(url) => {
          onChange(url);
          setCurrent(url);
        }}
        onBlur={vi.fn()}
        error={error}
        onUploadingChange={onUploadingChange}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, onChange, onUploadingChange };
}

const tab = (name: string) => screen.getByRole("tab", { name });
const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;
const selectFile = (container: HTMLElement, type = "image/jpeg") =>
  act(async () => void fireEvent.change(fileInput(container), { target: { files: [new File(["x"], "foto", { type })] } }));
const routeResponds = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

beforeEach(() => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1920, height: 1080, close: vi.fn() })));
  URL.createObjectURL = vi.fn(() => "blob:local-preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("CoverImageField", () => {
  it("por defecto abre «Subir imagen» con la zona de arrastre", () => {
    setup();
    expect(tab("Subir imagen").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("JPG, PNG o WebP · Máx. 5 MB")).toBeTruthy();
    expect(screen.queryByLabelText("URL de la imagen")).toBeNull();
  });

  it("en editar, una portada externa abre «Usar URL»", () => {
    setup({ value: EXTERNAL_URL, eventId: EVENT_ID });
    expect(tab("Usar URL").getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText("URL de la imagen") as HTMLInputElement).value).toBe(EXTERNAL_URL);
  });

  it("en editar, una portada de Blob abre «Subir imagen» con su vista previa y los recortes", () => {
    setup({ value: OLD_BLOB_URL, eventId: EVENT_ID });
    expect(tab("Subir imagen").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeTruthy();
    for (const crop of ["Detalle 16:9", "Hero escritorio 21:8", "Hero móvil 4:5"]) expect(screen.getByText(crop)).toBeTruthy();
    expect(screen.getByText("Deja lo importante en el centro: cada pantalla la recorta de forma distinta.")).toBeTruthy();
  });

  it("cambiar de pestaña no borra el valor", () => {
    const { onChange } = setup({ value: OLD_BLOB_URL, eventId: EVENT_ID });
    fireEvent.click(tab("Usar URL"));
    expect((screen.getByLabelText("URL de la imagen") as HTMLInputElement).value).toBe(OLD_BLOB_URL);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("«Usar URL» conserva su límite y conecta el error del formulario", () => {
    setup({ value: "http://x.com/a.jpg", error: "Ingresa una URL válida que empiece por https://" });
    const input = screen.getByLabelText("URL de la imagen") as HTMLInputElement;
    expect(input.maxLength).toBe(2000);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("cover-description cover-error");
    expect(document.getElementById("cover-error")?.textContent).toBe("Ingresa una URL válida que empiece por https://");
  });

  it("al crear, sube a events/draft con eventId null y pone la URL de Blob", async () => {
    vi.mocked(uploadPresigned).mockResolvedValue({ url: BLOB_URL } as Awaited<ReturnType<typeof uploadPresigned>>);
    const { container, onChange, onUploadingChange } = setup();
    await selectFile(container, "image/png");

    const [pathname, , options] = vi.mocked(uploadPresigned).mock.calls[0];
    expect(pathname).toMatch(new RegExp(`^events/draft/${UUID}\\.png$`));
    expect(options).toEqual({
      access: "public",
      handleUploadUrl: "/api/event-covers",
      clientPayload: JSON.stringify({ eventId: null }),
    });
    expect(onChange).toHaveBeenCalledWith(BLOB_URL);
    expect(onUploadingChange).toHaveBeenNthCalledWith(1, true);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("al editar, sube a events/<id> con ese eventId", async () => {
    vi.mocked(uploadPresigned).mockResolvedValue({ url: BLOB_URL } as Awaited<ReturnType<typeof uploadPresigned>>);
    const { container } = setup({ eventId: EVENT_ID });
    await selectFile(container, "image/webp");

    const [pathname, , options] = vi.mocked(uploadPresigned).mock.calls[0];
    expect(pathname).toMatch(new RegExp(`^events/${EVENT_ID}/${UUID}\\.webp$`));
    expect(options.clientPayload).toBe(JSON.stringify({ eventId: EVENT_ID }));
  });

  it.each([
    [401, "Inicia sesión para subir imágenes"],
    [403, "No tienes permiso para subir imágenes"],
    [403, "No puedes cambiar la portada de este evento"],
    [503, "La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”."],
  ])("si la ruta responde %i, muestra «%s» y no cambia el valor", async (status, message) => {
    vi.mocked(uploadPresigned).mockRejectedValue(new Error("Failed to retrieve the presigned URL"));
    routeResponds(status, { error: message });
    const { container, onChange } = setup({ value: OLD_BLOB_URL, eventId: EVENT_ID });
    await selectFile(container);

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(onChange).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/event-covers", expect.objectContaining({ method: "POST" }));
  });

  it("sin `{ error }` en la respuesta, usa el texto del status", async () => {
    vi.mocked(uploadPresigned).mockRejectedValue(new Error("Failed to retrieve the presigned URL"));
    routeResponds(503, {});
    const { container } = setup();
    await selectFile(container);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”.",
    );
  });

  it("si la ruta responde bien, el fallo es de Blob o de la red: mensaje genérico", async () => {
    vi.mocked(uploadPresigned).mockRejectedValue(new Error("network"));
    routeResponds(200, { type: "blob.generate-presigned-url" });
    const { container, onChange } = setup();
    await selectFile(container);
    expect((await screen.findByRole("alert")).textContent).toBe("No se pudo subir la imagen. Inténtalo de nuevo");
    expect(onChange).not.toHaveBeenCalled();
  });
});
