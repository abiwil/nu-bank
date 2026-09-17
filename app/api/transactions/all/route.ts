import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const limitParam = new URL(req.url).searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;
  if (limitParam && (!Number.isInteger(limit) || limit! <= 0)) {
    return Response.json(
      { error: "limit must be a positive integer" },
      { status: 400 },
    );
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });
    return Response.json(transactions);
  } catch {
    return new Response("Error fetching transactions", { status: 500 });
  }
}
