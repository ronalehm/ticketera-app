// @vitest-environment node
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "../types/auth.types";
import { getSessionUser, requireUser } from "./session.service";
import { AccountLinkError, ensureUser, findUserByClerkId } from "./users.service";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), currentUser: vi.fn(), clerkClient: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("./users.service", () => ({
  AccountLinkError: class AccountLinkError extends Error {},
  ensureUser: vi.fn(),
  findUserByClerkId: vi.fn(),
}));

const updateUserMetadata = vi.fn();

const USER: SessionUser = {
  id: "00000000-0000-8000-8000-000000000001",
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  phone: null,
  documentType: null,
  documentNumber: null,
  role: "customer",
  createdAt: new Date("2026-10-01T00:00:00Z"),
};

function mockSession(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}

function mockClerkUser(user: {
  role?: string;
  email?: string | null;
  verified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const { role, email = "Ana@Example.com", verified = true, firstName = "Ana", lastName = "Pérez" } = user;
  vi.mocked(currentUser).mockResolvedValue({
    firstName,
    lastName,
    publicMetadata: role ? { role } : {},
    primaryEmailAddress: email
      ? { emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }
      : null,
  } as unknown as Awaited<ReturnType<typeof currentUser>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clerkClient).mockResolvedValue({ users: { updateUserMetadata } } as unknown as Awaited<
    ReturnType<typeof clerkClient>
  >);
});

describe("getSessionUser", () => {
  it("sin sesión devuelve null sin consultar la BD ni Clerk", async () => {
    mockSession(null);
    expect(await getSessionUser()).toBeNull();
    expect(findUserByClerkId).not.toHaveBeenCalled();
    expect(currentUser).not.toHaveBeenCalled();
  });

  it("con fila existente la devuelve sin llamar a currentUser ni a ensureUser", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(USER);

    expect(await getSessionUser()).toEqual(USER);
    expect(findUserByClerkId).toHaveBeenCalledWith("user_1");
    expect(currentUser).not.toHaveBeenCalled();
    expect(ensureUser).not.toHaveBeenCalled();
  });

  it("con fila nueva llama a ensureUser con la identidad de Clerk y replica el rol si difiere", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(null);
    vi.mocked(ensureUser).mockResolvedValue(USER);
    mockClerkUser({ firstName: null, lastName: null });

    expect(await getSessionUser()).toEqual(USER);
    expect(ensureUser).toHaveBeenCalledWith({
      clerkId: "user_1",
      email: "Ana@Example.com",
      emailVerified: true,
      firstName: "",
      lastName: "",
    });
    expect(updateUserMetadata).toHaveBeenCalledWith("user_1", { publicMetadata: { role: "customer" } });
  });

  it("no replica el rol si publicMetadata.role ya coincide", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(null);
    vi.mocked(ensureUser).mockResolvedValue({ ...USER, role: "super_admin" });
    mockClerkUser({ role: "super_admin" });

    expect(await getSessionUser()).toMatchObject({ role: "super_admin" });
    expect(clerkClient).not.toHaveBeenCalled();
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("pasa emailVerified = false si Clerk no marca el correo como verificado", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(null);
    vi.mocked(ensureUser).mockResolvedValue(USER);
    mockClerkUser({ verified: false, role: "customer" });

    await getSessionUser();
    expect(ensureUser).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: false }));
  });

  it("lanza AccountLinkError si la cuenta de Clerk no tiene correo principal", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(null);
    mockClerkUser({ email: null });

    await expect(getSessionUser()).rejects.toThrow(AccountLinkError);
    expect(ensureUser).not.toHaveBeenCalled();
  });
});

describe("requireUser", () => {
  it("sin sesión redirige a /login", async () => {
    mockSession(null);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT /login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("con sesión devuelve el usuario", async () => {
    mockSession("user_1");
    vi.mocked(findUserByClerkId).mockResolvedValue(USER);
    expect(await requireUser()).toEqual(USER);
    expect(redirect).not.toHaveBeenCalled();
  });
});
