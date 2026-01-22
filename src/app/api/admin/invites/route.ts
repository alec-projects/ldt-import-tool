import { createAdminInvite, ensureSchema, getAdminByEmail } from "@/lib/db";
import { sendAdminInviteEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/session";
import { randomBytes } from "crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Email must be valid." }, { status: 400 });
  }

  await ensureSchema();
  const existingAdmin = await getAdminByEmail(email);
  if (existingAdmin) {
    return Response.json({ error: "That email is already an admin." }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await createAdminInvite({ email, token, expiresAt });

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const inviteUrl = new URL(`/admin/invite?token=${token}`, origin).toString();

  await sendAdminInviteEmail({
    to: email,
    inviteUrl,
  });

  return Response.json({
    ok: true,
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
