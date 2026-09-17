import { prisma } from "../../../lib/prisma";

export const getAccountByAccountNumber = async (accountNumber: string) => {
  return await prisma.account.findUnique({
    where: { accountNumber },
    select: { id: true, user: { select: { id: true } } },
  });
};

export const verifyUserAccountNumber = async (
  accountNumber: string,
  userId: string,
) => {
  return await prisma.account.findUnique({
    where: { accountNumber, userId },
    select: { id: true, balance: true },
  });
};
