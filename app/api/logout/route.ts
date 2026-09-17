import {
  verifySession,
  destroySession,
  deleteSessionCookie,
} from "../../../lib/session";

export async function POST() {
  const session = await verifySession();
  if (session) {
    await destroySession(session.sessionId);
  }
  await deleteSessionCookie();

  return new Response(null, { status: 204 });
}
