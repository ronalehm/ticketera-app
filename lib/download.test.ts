import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OBJECT_URL_REVOKE_DELAY_MS, downloadBlob } from "./download";

describe("downloadBlob", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:mock-url");
    revokeObjectURL = vi.fn<(url: string) => void>();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  /** Evita la navegación de jsdom; el enlace se recupera del contexto de la llamada. */
  const spyOnClick = () =>
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  it("descarga el blob con un enlace temporal que se quita tras el clic", () => {
    const click = spyOnClick();
    const blob = new Blob(["%PDF-"], { type: "application/pdf" });

    downloadBlob("mentec-MT-AB12CD.pdf", blob);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("mentec-MT-AB12CD.pdf");
    expect(link.getAttribute("href")).toBe("blob:mock-url");
    expect(link.isConnected).toBe(false);
  });

  it("revoca la URL solo al cumplirse OBJECT_URL_REVOKE_DELAY_MS", () => {
    spyOnClick();

    downloadBlob("evento.ics", new Blob(["BEGIN:VCALENDAR"]));

    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OBJECT_URL_REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("usa el mismo margen que FileSaver.js (40 s)", () => {
    expect(OBJECT_URL_REVOKE_DELAY_MS).toBe(40_000);
  });
});
