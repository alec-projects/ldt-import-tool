import { createAdminUser, ensureSchema, getAdminByEmail } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import bcrypt from "bcryptjs";

const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_ADMIN_DOMAIN = "letsdothis.com";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAllowedAdminEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_ADMIN_DOMAIN}`);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Email must be valid." }, { status: 400 });
  }
  if (!isAllowedAdminEmail(email)) {
    return Response.json(
      { error: `Admin email must be @${ALLOWED_ADMIN_DOMAIN}.` },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  await ensureSchema();
  const existingAdmin = await getAdminByEmail(email);
  if (existingAdmin) {
    return Response.json({ error: "That email is already an admin." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await createAdminUser(email, passwordHash);

  return Response.json({ ok: true });
}
