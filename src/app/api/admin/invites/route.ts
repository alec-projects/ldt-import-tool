import { createAdminInvite, ensureSchema, getAdminByEmail } from "@/lib/db";
import { sendAdminInviteEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/session";
import crypto from "crypto";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  await ensureSchema();

  const existing = await getAdminByEmail(email);
  if (existing) {
    return Response.json({ error: "Admin already exists." }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const invite = await createAdminInvite({ email, token, expiresAt });

  const origin = request.headers.get("origin") ?? "";
  const baseUrl = process.env.APP_URL || origin;
  if (!baseUrl) {
    return Response.json({ error: "APP_URL is not configured." }, { status: 500 });
  }
  const inviteUrl = `${baseUrl}/admin/accept?token=${invite.token}`;

  await sendAdminInviteEmail({ to: email, inviteUrl });

  return Response.json({ ok: true });
}
