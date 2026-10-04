import { describe, expect, it } from "vitest";
import { getAccountLinkAction } from "./getAccountLinkAction";

describe("getAccountLinkAction", () => {
  it("sin fila con ese correo → create", () => {
    expect(getAccountLinkAction(undefined, true)).toBe("create");
    expect(getAccountLinkAction(undefined, false)).toBe("create");
  });

  it("fila sin clerk_id y correo verificado → link", () => {
    expect(getAccountLinkAction({ clerkId: null }, true)).toBe("link");
  });

  it("fila sin clerk_id y correo no verificado → reject-unverified", () => {
    expect(getAccountLinkAction({ clerkId: null }, false)).toBe("reject-unverified");
  });

  it("fila con otro clerk_id → reject-conflict, aunque el correo esté verificado", () => {
    expect(getAccountLinkAction({ clerkId: "user_other" }, true)).toBe("reject-conflict");
    expect(getAccountLinkAction({ clerkId: "user_other" }, false)).toBe("reject-conflict");
  });
});
