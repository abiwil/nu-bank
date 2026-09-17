import { redirect } from "next/navigation";
import { ReceiptIcon } from "lucide-react";
import { cn } from "cn";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TransactionType } from "@/lib/generated/prisma/enums";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { AccountSwitcher } from "@/components/account-switcher";
import { AmountDialog } from "@/components/amount-dialog";
import { AmountDialogType } from "@/components/types/amount-dialog";
import { LogoutButton } from "@/components/logout-button";
import { TransferDialog } from "@/components/transfer-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Transfer",
};

const RECENT_TRANSACTIONS_LIMIT = 10;

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (accounts.length === 0) {
    redirect("/login");
  }

  const { account: requestedAccountNumber } = await searchParams;
  const account =
    accounts.find((a) => a.accountNumber === requestedAccountNumber) ??
    accounts[0];

  const transactions = await prisma.transaction.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: RECENT_TRANSACTIONS_LIMIT,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <LogoutButton />
      </header>

      <Card>
        <CardHeader>
          <CardDescription>Current balance</CardDescription>
          <CardTitle className="text-4xl font-semibold tabular-nums">
            {formatCurrency(account.balance.toNumber())}
          </CardTitle>
          {accounts.length > 1 && (
            <CardAction>
              <AccountSwitcher
                accountNumbers={accounts.map((a) => a.accountNumber)}
                selectedAccountNumber={account.accountNumber}
              />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Account {account.accountNumber}
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <AmountDialog
            id="deposit"
            type={AmountDialogType.DEPOSIT}
            accountNumber={account.accountNumber}
          />
          <AmountDialog
            id="withdraw"
            type={AmountDialogType.WITHDRAWAL}
            accountNumber={account.accountNumber}
          />
          <TransferDialog senderAccountNumber={account.accountNumber} />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>
            Your{" "}
            {transactions.length === RECENT_TRANSACTIONS_LIMIT
              ? `${RECENT_TRANSACTIONS_LIMIT} most recent`
              : "recent"}{" "}
            transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptIcon />
                </EmptyMedia>
                <EmptyTitle>No transactions yet</EmptyTitle>
                <EmptyDescription>
                  Deposits, withdrawals, and transfers will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const amount = transaction.amount.toNumber();
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.reference ??
                          TRANSACTION_LABELS[transaction.type]}
                        {transaction.counterpartyAccountNumber && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {amount < 0 ? "To" : "From"}{" "}
                            {transaction.counterpartyAccountNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TRANSACTION_LABELS[transaction.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          amount < 0 ? "text-destructive" : "text-primary",
                        )}
                      >
                        {formatSignedCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
