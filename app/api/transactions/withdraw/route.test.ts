import { beforeEach, describe, expect, it, vi } from "vitest";

import { Decimal } from "../../../../lib/generated/prisma/internal/prismaNamespace";

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

function withdrawRequest(body: unknown) {
  return new Request("http://localhost/api/transactions/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transactions/withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
  });

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(withdrawRequest({ amount: 10, accountNumber: "1" }));

    expect(res.status).toBe(401);
    expect(verifyUserAccountNumber).not.toHaveBeenCalled();
  });

  it("rejects a request with no account number", async () => {
    const res = await POST(withdrawRequest({ amount: 10 }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("No account selected");
  });

  it.each([0, -5, undefined, null])(
    "rejects a non-positive amount (%s)",
    async (amount) => {
      const res = await POST(
        withdrawRequest({ amount, accountNumber: "12345678" }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Amount must be greater than 0");
    },
  );

  it("returns 404 when the account doesn't belong to the user", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue(null);

    const res = await POST(
      withdrawRequest({ amount: 10, accountNumber: "12345678" }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("No account found for user");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a withdrawal that exceeds the account balance", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
      balance: 10,
    } as never);

    const res = await POST(
      withdrawRequest({ amount: 25, accountNumber: "12345678" }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Not enough funds to complete withdrawal");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows a withdrawal within balance when amount and balance are string-like Decimals", async () => {
    // Regression test: amount arrives as a string from the client, and
    // Prisma's Decimal stringifies via valueOf(), so a naive `>` comparison
    // between the two compares them lexicographically ("50" > "123.45")
    // instead of numerically, wrongly rejecting valid withdrawals.
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
      balance: new Decimal("123.45"),
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const res = await POST(
      withdrawRequest({ amount: "50", accountNumber: "12345678" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 200 });
  });

  it("debits the account and records a negative WITHDRAWAL transaction", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const res = await POST(
      withdrawRequest({
        amount: 25,
        reference: "Rent",
        accountNumber: "12345678",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 200 });
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { balance: { decrement: 25 } },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        accountId: "account-1",
        amount: -25,
        reference: "Rent",
        type: "WITHDRAWAL",
      },
    });
  });

  it("defaults the reference to 'Withdrawal' when none is given", async () => {
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await POST(withdrawRequest({ amount: 25, accountNumber: "12345678" }));

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reference: "Withdrawal" }),
    });
  });

  it("returns a 500 with an error message when the transaction fails, and logs it", async () => {
    const dbError = new Error("db down");
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(dbError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await POST(
      withdrawRequest({ amount: 25, accountNumber: "12345678" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Could not process withdrawal");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to process withdrawal",
      dbError,
    );

    consoleError.mockRestore();
  });
});
