import { createElement, type FormEvent } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useZodForm } from "./useZodForm";

const schema = z
  .object({
    name: z.string().trim().min(1, "Ingresa tu nombre"),
    password: z.string().min(1, "Ingresa una contraseña"),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.confirm !== data.password) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "No coinciden" });
    }
  });

const empty = { name: "", password: "", confirm: "" };

function submitEvent() {
  return {
    preventDefault: vi.fn(),
    currentTarget: document.createElement("form"),
  } as unknown as FormEvent<HTMLFormElement>;
}

afterEach(cleanup);

describe("useZodForm", () => {
  it("does not show errors on blur before the first submit", () => {
    const { result } = renderHook(() => useZodForm(schema, empty));
    act(() => result.current.handleBlur("name"));
    expect(result.current.errors).toEqual({});
  });

  it("fills errors on invalid submit and does not call onValid", () => {
    const onValid = vi.fn(async () => {});
    const { result } = renderHook(() => useZodForm(schema, empty));
    const event = submitEvent();
    act(() => result.current.handleSubmit(onValid)(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onValid).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({
      name: "Ingresa tu nombre",
      password: "Ingresa una contraseña",
    });
  });

  it("after the first attempt, blur on a fixed field clears only its error", () => {
    const { result } = renderHook(() => useZodForm(schema, empty));
    act(() => result.current.handleSubmit(async () => {})(submitEvent()));
    act(() => result.current.setValue("name", "Ana"));
    act(() => result.current.handleBlur("name"));
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.password).toBe("Ingresa una contraseña");
  });

  it("revalidates cross-field refinements with the latest values in the same handler", () => {
    const { result } = renderHook(() => useZodForm(schema, empty));
    act(() => result.current.handleSubmit(async () => {})(submitEvent()));
    act(() => {
      result.current.setValue("password", "abc12345");
      result.current.handleBlur("confirm");
    });
    expect(result.current.errors.confirm).toBe("No coinciden");
    expect(result.current.errors.password).toBe("Ingresa una contraseña");
  });

  it("calls onValid with parsed data and toggles isSubmitting", async () => {
    let resolve!: () => void;
    const onValid = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { result } = renderHook(() =>
      useZodForm(schema, { name: "  Ana  ", password: "x", confirm: "x" }),
    );
    act(() => result.current.handleSubmit(onValid)(submitEvent()));
    expect(onValid).toHaveBeenCalledWith({ name: "Ana", password: "x", confirm: "x" });
    expect(result.current.isSubmitting).toBe(true);
    await act(async () => resolve());
    expect(result.current.isSubmitting).toBe(false);
  });

  it("focuses the first invalid control after an invalid submit", () => {
    function TestForm() {
      const { errors, handleSubmit } = useZodForm(schema, { ...empty, name: "Ana" });
      return createElement(
        "form",
        { noValidate: true, onSubmit: handleSubmit(async () => {}) },
        createElement("input", { "aria-label": "name", "aria-invalid": !!errors.name }),
        createElement("input", { "aria-label": "password", "aria-invalid": !!errors.password }),
        createElement("button", { type: "submit" }, "Enviar"),
      );
    }
    render(createElement(TestForm));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(document.activeElement).toBe(screen.getByLabelText("password"));
  });
});
