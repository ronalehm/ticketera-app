import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { VenueMap } from "./VenueMap";

const VENUE = "Gran Teatro Nacional";
const EMBED_URL =
  "https://www.google.com/maps/embed/v1/place?key=test-key&q=Gran+Teatro+Nacional%2C+Lima%2C+Per%C3%BA&language=es&region=PE";

const viewMapButton = () => screen.queryByRole("button", { name: "Ver mapa" });

afterEach(cleanup);

describe("VenueMap", () => {
  it("sin embedUrl muestra solo el marcador decorativo, con el contenedor aria-hidden", () => {
    const { container } = render(<VenueMap venue={VENUE} embedUrl={null} />);

    expect(viewMapButton()).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("con embedUrl, antes de pulsar muestra 'Ver mapa' con el aviso de Google Maps y sin iframe", () => {
    const { container } = render(<VenueMap venue={VENUE} embedUrl={EMBED_URL} />);

    const button = viewMapButton();
    expect(button).not.toBeNull();
    expect(button?.getAttribute("type")).toBe("button");

    const noticeId = button?.getAttribute("aria-describedby");
    expect(noticeId).toBeTruthy();
    expect(document.getElementById(noticeId ?? "")?.textContent).toContain("Google Maps");

    expect(container.firstElementChild?.hasAttribute("aria-hidden")).toBe(false);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("al pulsar 'Ver mapa' monta el iframe con sus atributos, quita el botón y le pasa el foco", () => {
    const { container } = render(<VenueMap venue={VENUE} embedUrl={EMBED_URL} />);

    fireEvent.click(viewMapButton()!);

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("title")).toBe(`Mapa de ${VENUE}`);
    expect(iframe?.getAttribute("src")).toBe(EMBED_URL);
    expect(iframe?.getAttribute("loading")).toBe("lazy");
    expect(iframe?.getAttribute("referrerpolicy")).toBe("no-referrer-when-downgrade");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(true);

    expect(viewMapButton()).toBeNull();
    expect(document.activeElement).toBe(iframe);
  });
});
