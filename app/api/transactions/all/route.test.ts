import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
  prisma: {
    transaction: { findMany: vi.fn() },
  },
}));
vi.mock("../../../../lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";
import { GET } from "./route";

function makeRequest(url = "http://localhost/api/transactions/all") {
  return new Request(url);
}

describe("GET /api/transactions/all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it("returns the current user's transactions sorted by most recent", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
    const transactions = [{ id: "txn-1" }, { id: "txn-2" }];
    vi.mocked(prisma.transaction.findMany).mockResolvedValue(
      transactions as never
    );

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(transactions);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { account: { userId: "user-1" } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("applies the limit query param as a take", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([] as never);

    await GET(makeRequest("http://localhost/api/transactions/all?limit=20"));

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { account: { userId: "user-1" } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("rejects a non-positive-integer limit with 400", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);

    const res = await GET(
      makeRequest("http://localhost/api/transactions/all?limit=abc")
    );

    expect(res.status).toBe(400);
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it("returns a 500 when the lookup fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
    vi.mocked(prisma.transaction.findMany).mockRejectedValue(
      new Error("db down")
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });
});
