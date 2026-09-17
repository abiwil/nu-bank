import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    account: { update: vi.fn() },
    transaction: { create: vi.fn() },
  },
}));
vi.mock("../../../../lib/session", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("../helpers", () => ({
  verifyUserAccountNumber: vi.fn(),
}));

import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";
import { verifyUserAccountNumber } from "../helpers";
import { POST } from "./route";

function depositRequest(body: unknown) {
  return new Request("http://localhost/api/transactions/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transactions/deposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
  });

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(depositRequest({ amount: 10, accountNumber: "1" }));

    expect(res.status).toBe(401);
    expect(verifyUserAccountNumber).not.toHaveBeenCalled();
  });

  it("rejects a request with no account number", async () => {
    const res = await POST(depositRequest({ amount: 10 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No account selected");
  });

  it.each([0, -5, undefined, null])(
    "rejects a non-positive amount (%s)",
    async (amount) => {
      const res = await POST(
        depositRequest({ amount, accountNumber: "12345678" })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Amount must be greater than 0");
    }
  );

  it("returns 404 when the account doesn't belong to the user", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue(null);

    const res = await POST(
      depositRequest({ amount: 10, accountNumber: "12345678" })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("No account found for user");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("credits the account and records a DEPOSIT transaction", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const res = await POST(
      depositRequest({ amount: 25, reference: "Payday", accountNumber: "12345678" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 200 });
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { balance: { increment: 25 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        accountId: "account-1",
        amount: 25,
        reference: "Payday",
        type: "DEPOSIT",
      },
    });
  });

  it("defaults the reference to 'Deposit' when none is given", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await POST(depositRequest({ amount: 25, accountNumber: "12345678" }));

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reference: "Deposit" }),
    });
  });

  it("returns a 500 with an error message when the transaction fails, and logs it", async () => {
    const dbError = new Error("db down");
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
    } as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(dbError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(
      depositRequest({ amount: 25, accountNumber: "12345678" })
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Could not process deposit");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to process deposit",
      dbError
    );

    consoleError.mockRestore();
  });
});
