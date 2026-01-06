import { getAdminSession } from "@/lib/session";
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginPayload;
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return Response.json(
      { error: "Admin credentials are not configured." },
      { status: 500 },
    );
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!safeEqual(email, expectedEmail.toLowerCase())) {
    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!safeEqual(password, expectedPassword)) {
    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await getAdminSession();
  session.adminEmail = email;
  await session.save();

  return Response.json({ ok: true });
}
