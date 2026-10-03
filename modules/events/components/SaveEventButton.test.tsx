import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useSavedEventsStore } from "../stores/saved.store";
import { SaveEventButton } from "./SaveEventButton";

const SLUG = "concierto-demo";

const saveButtons = () => screen.getAllByRole("button", { name: "Guardar evento" });

beforeEach(() => {
  useSavedEventsStore.setState({ slugs: [] });
  localStorage.clear(); // setState también persiste
});

afterEach(cleanup);

describe("SaveEventButton", () => {
  it("alterna aria-pressed y el slug en el store al pulsarlo", () => {
    render(<SaveEventButton slug={SLUG} />);
    const [button] = saveButtons();
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(useSavedEventsStore.getState().slugs).toEqual([SLUG]);
    expect(button.querySelector("svg")?.getAttribute("class")).toContain("fill-current");

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(useSavedEventsStore.getState().slugs).toEqual([]);
    expect(button.querySelector("svg")?.getAttribute("class")).not.toContain("fill-current");
  });

  it("rehidrata al montar un slug guardado en localStorage", async () => {
    localStorage.setItem("mentec-saved", JSON.stringify({ state: { slugs: [SLUG] }, version: 0 }));

    render(<SaveEventButton slug={SLUG} />);

    await waitFor(() => expect(saveButtons()[0].getAttribute("aria-pressed")).toBe("true"));
  });

  it("dos instancias del mismo evento comparten estado", () => {
    render(
      <>
        <SaveEventButton slug={SLUG} />
        <SaveEventButton slug={SLUG} />
      </>,
    );
    const [mobile, desktop] = saveButtons();

    fireEvent.click(mobile);
    expect(desktop.getAttribute("aria-pressed")).toBe("true");
  });

  it("reenvía className y otras props al botón", () => {
    render(<SaveEventButton slug={SLUG} className="size-12" data-testid="save" />);
    const button = screen.getByTestId("save");

    expect(button.className).toContain("size-12");
    expect(button.className).not.toContain("size-11");
  });
});
