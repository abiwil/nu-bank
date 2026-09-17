import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    account: { findUnique: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { getAccountByAccountNumber, verifyUserAccountNumber } from "./helpers";

describe("getAccountByAccountNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up an account by account number only, regardless of owner", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: "account-1",
      user: { id: "user-1" },
    } as never);

    const result = await getAccountByAccountNumber("12345678");

    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { accountNumber: "12345678" },
      select: { id: true, user: { select: { id: true } } },
    });
    expect(result).toEqual({
      id: "account-1",
      user: { id: "user-1" },
    });
  });

  it("returns null when no account matches", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(null);

    await expect(getAccountByAccountNumber("00000000")).resolves.toBeNull();
  });
});

describe("verifyUserAccountNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up an account scoped to both account number and owning user, including its balance", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: "account-1",
      balance: 100,
    } as never);

    const result = await verifyUserAccountNumber("12345678", "user-1");

    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { accountNumber: "12345678", userId: "user-1" },
      select: { id: true, balance: true },
    });
    expect(result).toEqual({
      id: "account-1",
      balance: 100,
    });
  });

  it("returns null when the account number doesn't belong to that user", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(null);

    await expect(
      verifyUserAccountNumber("12345678", "someone-else"),
    ).resolves.toBeNull();
  });
});
