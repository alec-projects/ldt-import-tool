import { createAdminInvite, ensureSchema, getAdminByEmail } from "@/lib/db";
import { sendAdminInviteEmail } from "@/lib/email";
import { getAdminSession } from "@/lib/session";
import crypto from "crypto";

function getBaseUrl(request: Request) {
  const envUrl = process.env.APP_URL;
  if (envUrl) {
    return envUrl;
  }
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    return `https://${host}`;
  }
  return "";
}

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

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) {
    return Response.json(
      { error: "APP_URL is not configured." },
      { status: 500 },
    );
  }
  const inviteUrl = `${baseUrl}/admin/accept?token=${invite.token}`;

  try {
    const result = await sendAdminInviteEmail({ to: email, inviteUrl });
    return Response.json({ ok: true, id: (result as { data?: { id?: string } }).data?.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send invite.";
    return Response.json({ error: message }, { status: 500 });
  }
}
