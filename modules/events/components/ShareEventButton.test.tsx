import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShareEventButton } from "./ShareEventButton";

const TITLE = "Noche de Sintetizadores";

const shareButton = () => screen.getByRole("button", { name: "Compartir evento" });
const status = () => screen.getByRole("status");
const iconClass = () => shareButton().querySelector("svg")?.getAttribute("class") ?? "";

const mockNavigator = (key: "share" | "clipboard", value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true });

const clickShare = () =>
  act(async () => {
    fireEvent.click(shareButton());
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ShareEventButton", () => {
  it("con Web Share llama a navigator.share con el título y la URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    mockNavigator("share", share);
    mockNavigator("clipboard", { writeText });

    render(<ShareEventButton title={TITLE} />);
    expect(shareButton().getAttribute("type")).toBe("button");
    await clickShare();

    expect(share).toHaveBeenCalledWith({ title: TITLE, url: window.location.href });
    expect(writeText).not.toHaveBeenCalled();
    expect(status().textContent).toBe("");
  });

  it("si el usuario cancela (AbortError) no anuncia nada ni copia", async () => {
    const writeText = vi.fn();
    mockNavigator("share", vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError")));
    mockNavigator("clipboard", { writeText });

    render(<ShareEventButton title={TITLE} />);
    await clickShare();

    expect(writeText).not.toHaveBeenCalled();
    expect(status().textContent).toBe("");
    expect(iconClass()).toContain("lucide-share-2");
  });

  it("si navigator.share falla por otro motivo, copia el enlace", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigator("share", vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError")));
    mockNavigator("clipboard", { writeText });

    render(<ShareEventButton title={TITLE} />);
    await clickShare();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(status().textContent).toBe("Enlace copiado");
  });

  it("sin Web Share copia la URL, anuncia 'Enlace copiado' y a los 2 s vuelve el icono inicial", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigator("clipboard", { writeText });

    render(<ShareEventButton title={TITLE} />);
    expect(iconClass()).toContain("lucide-share-2");
    await clickShare();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(status().textContent).toBe("Enlace copiado");
    expect(iconClass()).toContain("lucide-check");

    act(() => vi.advanceTimersByTime(1999));
    expect(iconClass()).toContain("lucide-check");

    act(() => vi.advanceTimersByTime(1));
    expect(iconClass()).toContain("lucide-share-2");
    expect(status().textContent).toBe("");
  });

  it("si la copia falla anuncia 'No pudimos copiar el enlace'", async () => {
    mockNavigator("clipboard", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });

    render(<ShareEventButton title={TITLE} />);
    await clickShare();

    expect(status().textContent).toBe("No pudimos copiar el enlace");
    expect(iconClass()).toContain("lucide-share-2");
  });

  it("limpia el temporizador al desmontar", async () => {
    mockNavigator("clipboard", { writeText: vi.fn().mockResolvedValue(undefined) });

    const { unmount } = render(<ShareEventButton title={TITLE} />);
    await clickShare();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
