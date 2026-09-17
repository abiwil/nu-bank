import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: user.id } },
    });
    return Response.json(transactions);
  } catch {
    return new Response('Error fetching transactions', { status: 500 });
  }
}
