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
  getAccountByAccountNumber: vi.fn(),
  verifyUserAccountNumber: vi.fn(),
}));

import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";
import { getAccountByAccountNumber, verifyUserAccountNumber } from "../helpers";
import { POST } from "./route";

function transferRequest(body: unknown) {
  return new Request("http://localhost/api/transactions/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transactions/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "a@b.com",
    } as never);
  });

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await POST(
      transferRequest({
        amount: 10,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );

    expect(res.status).toBe(401);
    expect(getAccountByAccountNumber).not.toHaveBeenCalled();
  });

  it("returns 404 when the recipient account number doesn't exist", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue(null);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
    } as never);

    const res = await POST(
      transferRequest({
        amount: 10,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("No account found for recipient");
    expect(getAccountByAccountNumber).toHaveBeenCalledWith("22222222");
  });

  it("returns 404 when the sender account doesn't belong to the user", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue(null);

    const res = await POST(
      transferRequest({
        amount: 10,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("No account found for user");
    expect(verifyUserAccountNumber).toHaveBeenCalledWith("11111111", "user-1");
  });

  it("rejects transferring to the sender's own account", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "account-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "account-1",
    } as never);

    const res = await POST(
      transferRequest({
        amount: 10,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "11111111",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(
      "Cannot transfer to the same account. Select a different account",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([0, -5, undefined, null])(
    "rejects a non-positive amount (%s)",
    async (amount) => {
      vi.mocked(getAccountByAccountNumber).mockResolvedValue({
        id: "recipient-1",
      } as never);
      vi.mocked(verifyUserAccountNumber).mockResolvedValue({
        id: "sender-1",
      } as never);

      const res = await POST(
        transferRequest({
          amount,
          senderAccountNumber: "11111111",
          recipientAccountNumber: "22222222",
        }),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Amount must be greater than 0");
    },
  );

  it("rejects a transfer that exceeds the sender's balance", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
      balance: 10,
    } as never);

    const res = await POST(
      transferRequest({
        amount: 15,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Not enough funds to complete transfer");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows a transfer within balance when amount and balance are string-like Decimals", async () => {
    // Regression test: amount arrives as a string from the client, and
    // Prisma's Decimal stringifies via valueOf(), so a naive `>` comparison
    // between the two compares them lexicographically ("50" > "123.45")
    // instead of numerically, wrongly rejecting valid transfers.
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
      balance: new Decimal("123.45"),
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const res = await POST(
      transferRequest({
        amount: "50",
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 200 });
  });

  it("moves money out of the sender and into the recipient", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    const res = await POST(
      transferRequest({
        amount: 15,
        reference: "Lunch",
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 200 });

    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "sender-1" },
      data: { balance: { decrement: 15 } },
    });
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "recipient-1" },
      data: { balance: { increment: 15 } },
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        accountId: "sender-1",
        amount: -15,
        reference: "Lunch",
        type: "TRANSFER",
        counterpartyAccountNumber: "22222222",
      },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        accountId: "recipient-1",
        amount: 15,
        reference: "Lunch",
        type: "TRANSFER",
        counterpartyAccountNumber: "11111111",
      },
    });
  });

  it("defaults the reference to 'Transfer' when none is given", async () => {
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await POST(
      transferRequest({
        amount: 15,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reference: "Transfer" }),
    });
  });

  it("returns a 500 with an error message when the transaction fails, and logs it", async () => {
    const dbError = new Error("db down");
    vi.mocked(getAccountByAccountNumber).mockResolvedValue({
      id: "recipient-1",
    } as never);
    vi.mocked(verifyUserAccountNumber).mockResolvedValue({
      id: "sender-1",
      balance: 100,
    } as never);
    vi.mocked(prisma.$transaction).mockRejectedValue(dbError);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await POST(
      transferRequest({
        amount: 15,
        senderAccountNumber: "11111111",
        recipientAccountNumber: "22222222",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Could not process transfer");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to process transfer",
      dbError,
    );

    consoleError.mockRestore();
  });
});
