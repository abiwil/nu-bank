import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";
import { TransactionType } from "../lib/generated/prisma/enums";

// Dev-only fixture data. Every seed user shares this password.
const SEED_PASSWORD = "password123";

const USERS = [
  { email: "alice@nu.bank", accountNumbers: ["12345678", "12345679"] },
  { email: "bob@nu.bank", accountNumbers: ["11111111"] },
  { email: "carol@nu.bank", accountNumbers: ["10000003"] },
];

async function main() {
  // Wipe in FK order so re-running the seed is idempotent.
  await prisma.transaction.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const [alice, bob, carol] = await Promise.all(
    USERS.map(({ email, accountNumbers }) =>
      prisma.user.create({
        data: {
          email,
          passwordHash,
          accounts: {
            create: accountNumbers.map((accountNumber) => ({
              accountNumber,
              balance: 0,
            })),
          },
        },
        include: { accounts: true },
      })
    )
  );

  const [aliceAccount, aliceSavingsAccount] = alice.accounts;
  const bobAccount = bob.accounts[0];
  const carolAccount = carol.accounts[0];

  // Alice deposits, then transfers some of it to Bob.
  await prisma.$transaction([
    prisma.account.update({
      where: { id: aliceAccount.id },
      data: { balance: { increment: 500 } },
    }),
    prisma.transaction.create({
      data: {
        accountId: aliceAccount.id,
        amount: 500,
        type: TransactionType.DEPOSIT,
        reference: "Initial deposit",
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.account.update({
      where: { id: bobAccount.id },
      data: { balance: { increment: 300 } },
    }),
    prisma.transaction.create({
      data: {
        accountId: bobAccount.id,
        amount: 300,
        type: TransactionType.DEPOSIT,
        reference: "Initial deposit",
      },
    }),
  ]);

  const transferRef = "Rent";
  await prisma.$transaction([
    prisma.account.update({
      where: { id: aliceAccount.id },
      data: { balance: { decrement: 100 } },
    }),
    prisma.account.update({
      where: { id: bobAccount.id },
      data: { balance: { increment: 100 } },
    }),
    prisma.transaction.create({
      data: {
        accountId: aliceAccount.id,
        counterpartyAccountNumber: bobAccount.accountNumber,
        amount: -100,
        type: TransactionType.TRANSFER,
        reference: transferRef,
      },
    }),
    prisma.transaction.create({
      data: {
        accountId: bobAccount.id,
        counterpartyAccountNumber: aliceAccount.accountNumber,
        amount: 100,
        type: TransactionType.TRANSFER,
        reference: transferRef,
      },
    }),
  ]);

  // Alice's second account, useful for exercising account selection.
  await prisma.$transaction([
    prisma.account.update({
      where: { id: aliceSavingsAccount.id },
      data: { balance: { increment: 250 } },
    }),
    prisma.transaction.create({
      data: {
        accountId: aliceSavingsAccount.id,
        amount: 250,
        type: TransactionType.DEPOSIT,
        reference: "Savings top-up",
      },
    }),
  ]);

  // Carol is left with an empty account, useful for exercising empty states.
  void carolAccount;

  console.log("Seeded users (password for all: %s):", SEED_PASSWORD);
  for (const { email, accountNumbers } of USERS) {
    console.log(`  ${email} -> accounts ${accountNumbers.join(", ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
