import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authUserSchema } from "../schemas/auth.schema";
import { MOCK_LATENCY_MS } from "./auth.service";
import { signInWithGoogle } from "./googleAuth.service";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("signInWithGoogle", () => {
  it("no se resuelve antes de MOCK_LATENCY_MS", async () => {
    const resolved = vi.fn();
    signInWithGoogle().then(resolved);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS - 1);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });

  it("devuelve la cuenta de ejemplo de Google, que cumple authUserSchema", async () => {
    const promise = signInWithGoogle();
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
    const user = await promise;
    expect(user).toEqual({
      id: "usr-google-001",
      firstName: "Lucía",
      lastName: "Fernández Rojas",
      email: "lucia.fernandez@gmail.com",
    });
    expect(authUserSchema.safeParse(user).success).toBe(true);
  });
});
