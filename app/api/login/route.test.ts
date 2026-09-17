import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("../../../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    session: { create: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { hashPassword } from "../../../lib/auth";
import { POST } from "./route";

function fakeCookieStore() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((name: string) =>
      store.has(name) ? { value: store.get(name)! } : undefined,
    ),
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
  };
}

function loginRequest(body: unknown) {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/login", () => {
  let cookieStore: ReturnType<typeof fakeCookieStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore = fakeCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );
  });

  it("rejects a request missing email or password with 400", async () => {
    const res = await POST(loginRequest({ email: "a@b.com" }));

    expect(res.status).toBe(400);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an unknown email with a generic 401, no cookie set", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(
      loginRequest({ email: "nobody@b.com", password: "whatever" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("rejects a wrong password with the same generic 401, no cookie set", async () => {
    const passwordHash = await hashPassword("correct-password");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
      passwordHash,
    } as never);

    const res = await POST(
      loginRequest({ email: "a@b.com", password: "wrong-password" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Invalid email or password");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("logs a valid user in: creates a session, sets an httpOnly cookie, and never returns the password hash", async () => {
    const passwordHash = await hashPassword("correct-password");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
      passwordHash,
    } as never);
    vi.mocked(prisma.session.create).mockResolvedValue({} as never);

    const res = await POST(
      loginRequest({ email: "a@b.com", password: "correct-password" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: { id: "user-1", email: "a@b.com" } });
    expect(body.user.passwordHash).toBeUndefined();

    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    const { data } = vi.mocked(prisma.session.create).mock.calls[0][0] as {
      data: { userId: string };
    };
    expect(data.userId).toBe("user-1");

    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });
});
