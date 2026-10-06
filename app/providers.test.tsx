import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

const clerkMock = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useAuth: clerkMock.useAuth }));

const KEY = ["managed-events", "user-admin", { status: "all", q: "" }];

/** Monta Providers y devuelve su QueryClient con un dato cacheado. */
function setup(userId: string | null | undefined, isLoaded = true) {
  clerkMock.useAuth.mockReturnValue({ isLoaded, userId });
  let client: QueryClient | undefined;
  function Probe() {
    client = useQueryClient();
    return null;
  }
  const view = render(
    <Providers>
      <Probe />
    </Providers>,
  );
  client!.setQueryData(KEY, ["evento del admin"]);
  const rerenderAs = (nextUserId: string | null | undefined, nextIsLoaded = true) => {
    clerkMock.useAuth.mockReturnValue({ isLoaded: nextIsLoaded, userId: nextUserId });
    view.rerender(
      <Providers>
        <Probe />
      </Providers>,
    );
  };
  return { client: client!, rerenderAs };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Providers", () => {
  it("no limpia la caché en el primer render ni si el usuario no cambia", () => {
    const { client, rerenderAs } = setup("user-admin");
    rerenderAs("user-admin");
    expect(client.getQueryData(KEY)).toEqual(["evento del admin"]);
  });

  it("limpia la caché al cambiar de usuario", () => {
    const { client, rerenderAs } = setup("user-admin");
    rerenderAs("user-organizer");
    expect(client.getQueryData(KEY)).toBeUndefined();
  });

  it("limpia la caché al cerrar sesión (userId null)", () => {
    const { client, rerenderAs } = setup("user-admin");
    rerenderAs(null);
    expect(client.getQueryData(KEY)).toBeUndefined();
  });

  it("no limpia mientras Clerk carga ni cuando termina de cargar", () => {
    const { client, rerenderAs } = setup(undefined, false);
    rerenderAs("user-admin");
    expect(client.getQueryData(KEY)).toEqual(["evento del admin"]);
  });
});
