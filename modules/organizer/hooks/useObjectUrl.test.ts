import { StrictMode, createElement, type ReactNode } from "react";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useObjectUrl } from "./useObjectUrl";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

let createObjectURL: ReturnType<typeof vi.fn<(obj: Blob | MediaSource) => string>>;
let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

function makeFile(name: string) {
  return new File(["contenido"], name, { type: "image/png" });
}

beforeEach(() => {
  let count = 0;
  createObjectURL = vi.fn(() => `blob:mock-${++count}`);
  revokeObjectURL = vi.fn();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  cleanup();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("useObjectUrl", () => {
  it("returns null when there is no file", () => {
    const { result } = renderHook(() => useObjectUrl(null));
    expect(result.current).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("returns the created URL for a file", () => {
    const file = makeFile("portada.png");
    const { result } = renderHook(() => useObjectUrl(file));
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(result.current).toBe("blob:mock-1");
  });

  it("revokes the previous URL when the file changes", () => {
    const first = makeFile("uno.png");
    const second = makeFile("dos.png");
    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: first as File | null },
    });
    expect(result.current).toBe("blob:mock-1");

    rerender({ file: second });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
    expect(result.current).toBe("blob:mock-2");

    rerender({ file: null });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-2");
    expect(result.current).toBeNull();
  });

  it("revokes the current URL on unmount", () => {
    const file = makeFile("portada.png");
    const { result, unmount } = renderHook(() => useObjectUrl(file));
    const url = result.current;
    expect(revokeObjectURL).not.toHaveBeenCalled();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it("works in StrictMode: returns a live URL and revokes every URL it creates", () => {
    const file = makeFile("portada.png");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { result, unmount } = renderHook(() => useObjectUrl(file), { wrapper });

    const revoked = () => revokeObjectURL.mock.calls.map(([url]) => url);
    expect(result.current).not.toBeNull();
    expect(revoked()).not.toContain(result.current);

    unmount();
    const created = createObjectURL.mock.results.map((r) => r.value);
    expect(revoked().sort()).toEqual(created.sort());
  });
});
