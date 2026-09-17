## nu-bank

A small banking app: sign in, view account balance, deposit, withdraw, and transfer between accounts.

Next.js (React) frontend using shadcn components, Node/TypeScript API routes, PostgreSQL via Prisma.

### Running locally

Prerequisites: Node.js (version pinned in `.nvmrc`, currently 24; run `nvm use`), npm, Docker.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`docker compose up -d` starts a local PostgreSQL 16 container (see `docker-compose.yml`), and `DATABASE_URL` in `.env` (copied from `.env.example`) points at it.
The frontend, backend, and database all run locally with no cloud dependency.

### Test accounts

`npx prisma db seed` creates three users, all with password `password123`.

| Email         | Accounts           |
| ------------- | ------------------ |
| alice@nu.bank | 12345678, 12345679 |
| bob@nu.bank   | 11111111           |
| carol@nu.bank | 10000003           |

Alice has two accounts you can use to test switching accounts and self-transfers.

Bob's account contains transactions from Alice.

Carol's account has no transactions to test empty states.

### Running tests

```bash
npm run test
```

### Design notes

**Balance** is stored as a column on `Account` rather than derived by summing `Transaction` rows, so reads are always O(1).
The trade-off for that is that it creates two sources of truth for the same fact, so every deposit, withdrawal, and transfer must update `balance` and insert its `Transaction` row(s) inside a single DB transaction, to keep the two in sync atomically.

**Transfers** between two of the app's own accounts are recorded as two `Transaction` rows: a negative debit on the source account and a positive credit on the target account, sharing a `reference` so the pair can be reconstructed as a single transfer.
Deposits and withdrawals are done on a single-row, since there's no second internal account involved. This design assumes transfers will be done among other users of the app.

### Out of scope

- Account creation and password reset. The login form's "Sign up" and "Forgot your password?" links are placeholders. The three seeded test accounts are the only ways to test the app.
- True double-entry bookkeeping for deposits and withdrawals. A transfer posts both legs, but a deposit or withdrawal posts a single row rather than against an external/cash account.
- Multi-currency support. Amounts are stored and formatted as a single currency (GBP).
- Rate limiting or brute-force protection on login.

### Next improvements

- **Concurrency control on balance updates.** Deposits, withdrawals, and transfers check the balance with a plain read before writing, so two concurrent requests against the same account can both pass the balance check and overdraw it.

- **Full transaction history.** `GET /api/transactions/all` can return a user's complete history, but there's no way to see beyond the 10 most recent transactions. Add pagination and filtration to the table.

- **Ledger-derived balance.** A stored `balance` column is a second source of truth alongside the `Transaction` log. If prevent drift was a priority the ideal solution would be to have an event sourced or ledger-derived balance.
