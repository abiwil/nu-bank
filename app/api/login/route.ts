import { verifyPassword } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { createSession, setSessionCookie } from "../../../lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  return Response.json(
    { user: { id: user.id, email: user.email } },
    { status: 200 }
  );
}
