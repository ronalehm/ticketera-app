import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TicketPager } from "./TicketPager";

afterEach(cleanup);

const renderPager = (index: number, count: number) => {
  const onIndexChange = vi.fn();
  render(<TicketPager index={index} count={count} onIndexChange={onIndexChange} />);
  return {
    onIndexChange,
    previous: screen.getByRole("button", { name: "Entrada anterior" }),
    next: screen.getByRole("button", { name: "Entrada siguiente" }),
  };
};

function StatefulPager({ count }: { count: number }) {
  const [index, setIndex] = useState(0);
  return <TicketPager index={index} count={count} onIndexChange={setIndex} />;
}

describe("TicketPager", () => {
  it("muestra 'Entrada n de N' en un único nodo anunciado y deshabilita la flecha anterior en la primera", () => {
    const { previous, next } = renderPager(0, 3);

    const group = screen.getByRole("group", { name: "Entradas del pedido" });
    const label = screen.getByText("Entrada 1 de 3");
    expect(group.contains(label)).toBe(true);
    expect(label.getAttribute("aria-live")).toBe("polite");
    expect(label.getAttribute("aria-atomic")).toBe("true");
    expect(label.childNodes).toHaveLength(1);

    expect(previous.getAttribute("aria-disabled")).toBe("true");
    previous.focus();
    expect(document.activeElement).toBe(previous);
    expect(next.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("al pulsar las flechas llama a onIndexChange con la entrada siguiente o anterior", () => {
    const { onIndexChange, previous, next } = renderPager(1, 3);

    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(previous);
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(onIndexChange).toHaveBeenCalledTimes(2);
  });

  it("en la última entrada la flecha siguiente queda deshabilitada y no llama a onIndexChange", () => {
    const { onIndexChange, next } = renderPager(2, 3);

    expect(next.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(next);
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("ArrowRight/ArrowLeft cambian de entrada sin mover el foco y no hacen nada en los extremos", () => {
    const { onIndexChange, previous, next } = renderPager(0, 3);

    next.focus();
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    expect(document.activeElement).toBe(next);

    // Desde un botón deshabilitado (la flecha anterior en la entrada 1).
    previous.focus();
    fireEvent.keyDown(previous, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(previous, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(document.activeElement).toBe(previous);
  });

  it("ArrowRight en la última entrada, también desde la flecha deshabilitada, no llama a onIndexChange", () => {
    const { onIndexChange, previous, next } = renderPager(2, 3);

    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(onIndexChange).not.toHaveBeenCalled();
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(1);
    fireEvent.keyDown(previous, { key: "ArrowLeft" });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it("ignora otras teclas", () => {
    const { onIndexChange, next } = renderPager(1, 3);

    fireEvent.keyDown(screen.getByRole("group", { name: "Entradas del pedido" }), { key: "Enter" });
    fireEvent.keyDown(next, { key: "ArrowUp" });
    fireEvent.keyDown(next, { key: "Home" });
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("con una sola entrada muestra 'Entrada 1 de 1' y las dos flechas visibles y deshabilitadas", () => {
    const { previous, next } = renderPager(0, 1);

    expect(screen.getByText("Entrada 1 de 1")).toBeTruthy();
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(previous.hidden || next.hidden).toBe(false);
  });

  it("reenvía className y atributos a la raíz", () => {
    render(
      <TicketPager index={0} count={2} onIndexChange={() => {}} className="print:hidden" data-testid="pager" />,
    );

    const root = screen.getByTestId("pager");
    expect(root.getAttribute("role")).toBe("group");
    expect(root.classList).toContain("print:hidden");
    expect(root.classList).toContain("@container");
  });

  it("con estado del consumidor, avanza el texto y conserva el foco en la flecha pulsada", () => {
    render(<StatefulPager count={3} />);
    const next = screen.getByRole("button", { name: "Entrada siguiente" });

    next.focus();
    fireEvent.click(next);
    expect(screen.getByText("Entrada 2 de 3")).toBeTruthy();
    expect(document.activeElement).toBe(next);

    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(screen.getByText("Entrada 3 de 3")).toBeTruthy();
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(next);
  });
});
