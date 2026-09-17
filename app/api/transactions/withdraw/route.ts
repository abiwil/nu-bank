import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";
import { TransactionType } from "../../../../lib/generated/prisma/enums";
import { verifyUserAccountNumber } from "../helpers";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { amount: rawAmount, reference, accountNumber } = await req.json();
  const amount = Number(rawAmount);

  if (!accountNumber) {
    return Response.json({ error: "No account selected" }, { status: 400 });
  }

  if (!amount || amount <= 0) {
    return Response.json(
      { error: "Amount must be greater than 0" },
      { status: 400 },
    );
  }

  const account = await verifyUserAccountNumber(accountNumber, user.id);

  if (!account) {
    return Response.json(
      { error: "No account found for user" },
      { status: 404 },
    );
  }

  if (amount > Number(account.balance)) {
    return Response.json(
      { error: "Not enough funds to complete withdrawal" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { balance: { decrement: amount } },
      }),
      prisma.transaction.create({
        data: {
          accountId: account.id,
          amount: -amount,
          reference: reference || "Withdrawal",
          type: TransactionType.WITHDRAWAL,
        },
      }),
    ]);

    return Response.json({ status: 200 });
  } catch (error) {
    console.error("Failed to process withdrawal", error);
    return Response.json(
      { error: "Could not process withdrawal" },
      { status: 500 },
    );
  }
}
