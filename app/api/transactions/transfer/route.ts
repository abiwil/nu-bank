import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";
import { TransactionType } from "../../../../lib/generated/prisma/enums";
import { getAccountByAccountNumber, verifyUserAccountNumber } from "../helpers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    amount: rawAmount,
    reference,
    senderAccountNumber,
    recipientAccountNumber,
  } = await req.json();
  const amount = Number(rawAmount);

  const recipient = await getAccountByAccountNumber(recipientAccountNumber);
  const sender = await verifyUserAccountNumber(senderAccountNumber, user.id);

  if (!recipient) {
    return Response.json(
      { error: "No account found for recipient" },
      { status: 404 },
    );
  }

  if (!sender) {
    return Response.json(
      { error: "No account found for user" },
      { status: 404 },
    );
  }

  if (sender.id === recipient.id) {
    return Response.json(
      {
        error:
          "Cannot transfer to the same account. Select a different account",
      },
      { status: 400 },
    );
  }

  if (!amount || amount <= 0) {
    return Response.json(
      { error: "Amount must be greater than 0" },
      { status: 400 },
    );
  }

  if (amount > Number(sender.balance)) {
    return Response.json(
      { error: "Not enough funds to complete transfer" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      // Withdrawal entry for logged in user
      prisma.account.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } },
      }),
      prisma.transaction.create({
        data: {
          accountId: sender.id,
          amount: -amount,
          reference: reference || "Transfer",
          type: TransactionType.TRANSFER,
          counterpartyAccountNumber: recipientAccountNumber,
        },
      }),

      // Deposit entry for recipient
      prisma.account.update({
        where: { id: recipient.id },
        data: { balance: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          accountId: recipient.id,
          amount: amount,
          reference: reference || "Transfer",
          type: TransactionType.TRANSFER,
          counterpartyAccountNumber: senderAccountNumber,
        },
      }),
    ]);

    return Response.json({ status: 200 });
  } catch (error) {
    console.error("Failed to process transfer", error);
    return Response.json(
      { error: "Could not process transfer" },
      { status: 500 },
    );
  }
}
