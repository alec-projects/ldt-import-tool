import {
  createAdminUser,
  ensureSchema,
  getAdminByEmail,
  getInviteByToken,
  markInviteUsed,
} from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_ADMIN_DOMAIN = "letsdothis.com";

function isAllowedAdminEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_ADMIN_DOMAIN}`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  if (!token) {
    return Response.json({ error: "Invite token is required." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  await ensureSchema();
  const invite = await getInviteByToken(token);
  if (!invite) {
    return Response.json({ error: "Invite not found." }, { status: 400 });
  }
  if (invite.used_at) {
    return Response.json({ error: "Invite has already been used." }, { status: 400 });
  }

  const expiresAt = invite.expires_at instanceof Date ? invite.expires_at : new Date(invite.expires_at);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return Response.json({ error: "Invite has expired." }, { status: 400 });
  }

  const email = invite.email.toLowerCase();
  if (!isAllowedAdminEmail(email)) {
    return Response.json(
      { error: `Admin email must be @${ALLOWED_ADMIN_DOMAIN}` },
      { status: 400 },
    );
  }
  const existingAdmin = await getAdminByEmail(email);
  if (existingAdmin) {
    return Response.json({ error: "Admin already exists." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await createAdminUser(email, passwordHash);
  await markInviteUsed(invite.id);

  const session = await getAdminSession();
  session.adminEmail = email;
  await session.save();

  return Response.json({ ok: true });
}
