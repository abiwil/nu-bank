import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("./prisma", () => ({
  prisma: {
    session: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "./prisma";
import {
  createSession,
  destroySession,
  deleteSessionCookie,
  getCurrentUser,
  setSessionCookie,
  verifySession,
} from "./session";

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

describe("session helpers", () => {
  let cookieStore: ReturnType<typeof fakeCookieStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore = fakeCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );
  });

  describe("createSession", () => {
    it("persists a hash of the token, never the raw token", async () => {
      vi.mocked(prisma.session.create).mockResolvedValue({} as never);

      const { token, expiresAt } = await createSession("user-1");

      expect(prisma.session.create).toHaveBeenCalledTimes(1);
      const { data } = vi.mocked(prisma.session.create).mock.calls[0][0] as {
        data: { tokenHash: string; userId: string; expiresAt: Date };
      };
      expect(data.userId).toBe("user-1");
      expect(data.tokenHash).not.toBe(token);
      expect(data.tokenHash).toHaveLength(64);
      expect(data.expiresAt).toBe(expiresAt);
    });
  });

  describe("setSessionCookie / deleteSessionCookie", () => {
    it("sets an httpOnly, lax cookie with the given expiry", async () => {
      const expiresAt = new Date(Date.now() + 1000);
      await setSessionCookie("raw-token", expiresAt);

      expect(cookieStore.set).toHaveBeenCalledWith(
        "session",
        "raw-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expiresAt,
        }),
      );
    });

    it("removes the session cookie", async () => {
      cookieStore.set("session", "raw-token");
      await deleteSessionCookie();
      expect(cookieStore.delete).toHaveBeenCalledWith("session");
    });
  });

  describe("verifySession", () => {
    it("returns null when there is no session cookie", async () => {
      await expect(verifySession()).resolves.toBeNull();
      expect(prisma.session.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when the token doesn't match any session", async () => {
      cookieStore.set("session", "raw-token");
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      await expect(verifySession()).resolves.toBeNull();
    });

    it("returns the session for a valid, unexpired token", async () => {
      cookieStore.set("session", "raw-token");
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        tokenHash: "irrelevant",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60),
        createdAt: new Date(),
      } as never);

      await expect(verifySession()).resolves.toEqual({
        userId: "user-1",
        sessionId: "session-1",
      });
    });

    it("returns null for an expired session", async () => {
      cookieStore.set("session", "raw-token");
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        tokenHash: "irrelevant",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      } as never);

      await expect(verifySession()).resolves.toBeNull();
    });

    it("looks the session up by a hash of the cookie token, not the raw token", async () => {
      cookieStore.set("session", "raw-token");
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      await verifySession();

      const { where } = vi.mocked(prisma.session.findUnique).mock
        .calls[0][0] as {
        where: { tokenHash: string };
      };
      expect(where.tokenHash).not.toBe("raw-token");
      expect(where.tokenHash).toHaveLength(64);
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when there is no session", async () => {
      await expect(getCurrentUser()).resolves.toBeNull();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns only id and email, never the password hash", async () => {
      cookieStore.set("session", "raw-token");
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-1",
        tokenHash: "irrelevant",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60),
        createdAt: new Date(),
      } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "a@b.com",
      } as never);

      await expect(getCurrentUser()).resolves.toEqual({
        id: "user-1",
        email: "a@b.com",
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true, email: true },
      });
    });
  });

  describe("destroySession", () => {
    it("deletes the session row by id", async () => {
      await destroySession("session-1");
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });
  });
});
