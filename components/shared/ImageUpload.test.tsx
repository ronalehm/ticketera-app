import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImageUpload, ImageUploadError } from "./ImageUpload";
import type { ImageUploadProps } from "./ImageUpload";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const RECOMMENDED = { width: 1920, height: 1080, minWidth: 1200 };
const BLOB_URL = "https://abc.public.blob.vercel-storage.com/events/draft/new.jpg";
const OLD_URL = "https://abc.public.blob.vercel-storage.com/events/draft/old.jpg";

let imageSize = { width: 1920, height: 1080 };

function makeFile(type = "image/jpeg", size = 1.8 * 1024 * 1024, name = "portada.jpg") {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function deferred() {
  let resolve!: (value: { url: string }) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<{ url: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Renderiza el componente controlado (como lo usa un formulario) y espía `onChange`. */
function setup(props: Partial<ImageUploadProps> = {}) {
  const onChange = vi.fn();
  const upload = props.upload ?? vi.fn(async () => ({ url: BLOB_URL }));
  function Harness() {
    const [value, setValue] = useState(props.value ?? "");
    return (
      <ImageUpload
        accept={ACCEPT}
        maxBytes={MAX_BYTES}
        recommended={RECOMMENDED}
        {...props}
        upload={upload}
        value={value}
        onChange={(url) => {
          onChange(url);
          setValue(url);
        }}
      />
    );
  }
  const utils = render(<Harness />);
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...utils, onChange, upload, input };
}

const select = (input: HTMLInputElement, file: File) => act(async () => void fireEvent.change(input, { target: { files: [file] } }));
const drop = (target: Element, file: File) => act(async () => void fireEvent.drop(target, { dataTransfer: { files: [file] } }));
const previewImg = (container: HTMLElement) => container.querySelector("img");

beforeEach(() => {
  imageSize = { width: 1920, height: 1080 };
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ ...imageSize, close: vi.fn() })));
  URL.createObjectURL = vi.fn(() => "blob:local-preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ImageUpload", () => {
  it("vacío: muestra la zona de arrastre con tipos, peso máximo y tamaño recomendado enlazados al botón", () => {
    setup();
    expect(screen.getByText("Arrastra una imagen aquí")).toBeTruthy();
    const requirements = screen.getByText("JPG, PNG o WebP · Máx. 5 MB").parentElement!;
    expect(requirements.textContent).toContain("Tamaño recomendado: 1920 × 1080 px (16:9)");
    const button = screen.getByRole("button", { name: "Seleccionar archivo" });
    expect(button.getAttribute("aria-describedby")).toContain(requirements.id);
  });

  it("drag & drop: resalta la zona y al soltar sube y muestra la vista previa con medidas y peso", async () => {
    const { container, onChange, upload } = setup();
    const zone = screen.getByRole("button", { name: "Seleccionar archivo" });

    fireEvent.dragOver(zone);
    expect(screen.getByText("Suelta la imagen")).toBeTruthy();

    const file = makeFile();
    await drop(zone, file);

    expect(upload).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith(BLOB_URL);
    expect(previewImg(container)?.getAttribute("src")).toBe(BLOB_URL);
    expect(screen.getByText("1920 × 1080 px · 1.8 MB")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();
  });

  it("selección por botón: el botón abre el selector y el archivo elegido se sube", async () => {
    const { input, onChange } = setup();
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Seleccionar archivo" }));
    expect(click).toHaveBeenCalled();

    await select(input, makeFile("image/png", 300 * 1024, "a.png"));
    expect(onChange).toHaveBeenCalledWith(BLOB_URL);
    expect(screen.getByText("1920 × 1080 px · 300 kB")).toBeTruthy();
  });

  it("selección por teclado: el botón es nativo y enfocable, y su activación abre el selector", () => {
    const { input } = setup({ id: "cover" });
    const click = vi.spyOn(input, "click");
    const button = screen.getByRole("button", { name: "Seleccionar archivo" });

    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tagName).toBe("BUTTON");
    expect(button.id).toBe("cover");
    // Enter/Espacio sobre un <button> nativo dispara click (jsdom no lo simula).
    fireEvent.click(button);
    expect(click).toHaveBeenCalled();
  });

  it("rechaza un archivo de más de 5 MB sin llamar a upload", async () => {
    const { input, upload, onChange } = setup();
    await select(input, makeFile("image/jpeg", MAX_BYTES + 1));
    expect(screen.getByRole("alert").textContent).toBe("La imagen pesa más de 5 MB");
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("rechaza un tipo no permitido (GIF, PDF) sin llamar a upload", async () => {
    const { input, upload } = setup();
    await select(input, makeFile("image/gif", 1000, "a.gif"));
    expect(screen.getByRole("alert").textContent).toBe("Solo JPG, PNG o WebP");
    await select(input, makeFile("application/pdf", 1000, "a.pdf"));
    expect(screen.getByRole("alert").textContent).toBe("Solo JPG, PNG o WebP");
    expect(upload).not.toHaveBeenCalled();
  });

  it("ancho < 1200 px: sube igualmente y muestra la advertencia", async () => {
    imageSize = { width: 800, height: 450 };
    const { input, onChange } = setup();
    await select(input, makeFile());
    expect(onChange).toHaveBeenCalledWith(BLOB_URL);
    expect(
      screen.getByText("La imagen mide 800 px de ancho; se recomienda al menos 1200 px para que no se vea borrosa"),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preview existente: con value inicial muestra la imagen, «Cambiar imagen» y «Eliminar»", () => {
    const { container } = setup({ value: OLD_URL });
    expect(previewImg(container)?.getAttribute("src")).toBe(OLD_URL);
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();
    expect(screen.queryByText("Arrastra una imagen aquí")).toBeNull();
  });

  it("eliminar: llama a onChange('') y vuelve a la zona vacía", () => {
    const { onChange } = setup({ value: OLD_URL });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByText("Arrastra una imagen aquí")).toBeTruthy();
  });

  it("reemplazo: la actual se mantiene hasta que la nueva termina; botones deshabilitados y sin doble envío", async () => {
    const pending = deferred();
    const upload = vi.fn(() => pending.promise);
    const onUploadingChange = vi.fn();
    const { container, input, onChange } = setup({ value: OLD_URL, upload, onUploadingChange });

    await select(input, makeFile());
    expect(onChange).not.toHaveBeenCalled();
    expect(previewImg(container)?.getAttribute("src")).toBe("blob:local-preview");
    expect(screen.getAllByText("Subiendo…").length).toBeGreaterThan(0);
    expect(onUploadingChange).toHaveBeenLastCalledWith(true);
    expect((screen.getByRole("button", { name: "Cambiar imagen" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Eliminar" }) as HTMLButtonElement).disabled).toBe(true);

    // Un segundo archivo (soltado) durante la subida se ignora.
    await drop(screen.getByRole("button", { name: "Cambiar imagen" }), makeFile("image/png"));
    expect(upload).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve({ url: BLOB_URL }));
    expect(onChange).toHaveBeenCalledWith(BLOB_URL);
    expect(previewImg(container)?.getAttribute("src")).toBe(BLOB_URL);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-preview");
  });

  it("error de upload: conserva el valor anterior y muestra el error genérico", async () => {
    const pending = deferred();
    const { container, input, onChange } = setup({ value: OLD_URL, upload: () => pending.promise });
    await select(input, makeFile());
    await act(async () => pending.reject(new Error("network")));

    expect(onChange).not.toHaveBeenCalled();
    expect(previewImg(container)?.getAttribute("src")).toBe(OLD_URL);
    expect(screen.getByRole("alert").textContent).toBe("No se pudo subir la imagen. Inténtalo de nuevo");
  });

  it("error de upload con ImageUploadError: muestra su mensaje", async () => {
    const upload = vi.fn(async () => {
      throw new ImageUploadError("No tienes permiso para subir imágenes");
    });
    const { input, onChange } = setup({ upload });
    await select(input, makeFile());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("No tienes permiso para subir imágenes");
  });

  it("renderPreviewExtra recibe la URL mostrada", () => {
    setup({ value: OLD_URL, renderPreviewExtra: (src) => <p>extra:{src}</p> });
    expect(screen.getByText(`extra:${OLD_URL}`)).toBeTruthy();
  });
});
