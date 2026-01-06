import { createAdminUser, ensureSchema, getInviteByToken, markInviteUsed } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  await ensureSchema();
  const params = await context.params;
  const invite = await getInviteByToken(params.token);
  if (!invite) {
    return Response.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.used_at) {
    return Response.json({ error: "Invite already used." }, { status: 400 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return Response.json({ error: "Invite expired." }, { status: 400 });
  }
  return Response.json({ email: invite.email });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  await ensureSchema();
  const params = await context.params;
  const invite = await getInviteByToken(params.token);
  if (!invite) {
    return Response.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.used_at) {
    return Response.json({ error: "Invite already used." }, { status: 400 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return Response.json({ error: "Invite expired." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password?.trim();
  if (!password || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await createAdminUser(invite.email, passwordHash);
  await markInviteUsed(invite.id);

  return Response.json({ ok: true });
}
