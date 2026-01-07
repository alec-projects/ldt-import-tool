import { createAdminUser, ensureSchema, getAdminByEmail } from "@/lib/db";
import { getClientIp, getRateLimitConfig, rateLimit } from "@/lib/rate-limit";
import { getAdminSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

type LoginPayload = {
  email?: string;
  password?: string;
};

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

const loginRateLimit = getRateLimitConfig("LOGIN_RATE_LIMIT", {
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`admin-login:${ip}`, loginRateLimit);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: limit.retryAfter
          ? { "Retry-After": String(limit.retryAfter) }
          : undefined,
      },
    );
  }

  await ensureSchema();
  const body = (await request.json().catch(() => ({}))) as LoginPayload;
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  const existingAdmin = await getAdminByEmail(email);
  if (existingAdmin) {
    const ok = await bcrypt.compare(password, existingAdmin.password_hash);
    if (!ok) {
      return Response.json({ error: "Invalid credentials." }, { status: 401 });
    }
  } else {
    if (!expectedEmail || !expectedPassword) {
      return Response.json(
        { error: "Admin credentials are not configured." },
        { status: 500 },
      );
    }
    if (!safeEqual(email, expectedEmail.toLowerCase())) {
      return Response.json({ error: "Invalid credentials." }, { status: 401 });
    }
    if (!safeEqual(password, expectedPassword)) {
      return Response.json({ error: "Invalid credentials." }, { status: 401 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await createAdminUser(email, passwordHash);
  }

  const session = await getAdminSession();
  session.adminEmail = email;
  await session.save();

  return Response.json({ ok: true });
}
