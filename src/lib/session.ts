import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = {
  adminEmail?: string;
};

function resolveSessionPassword() {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_PASSWORD must be set to a secure 32+ character value.",
      );
    }
    console.warn(
      "SESSION_PASSWORD is not set or too short; using insecure dev fallback.",
    );
    return "dev-only-session-password-change-me-32chars";
  }
  return password;
}

const sessionOptions: SessionOptions = {
  cookieName: "ldt_admin_session",
  password: resolveSessionPassword(),
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSession>(cookieStore, sessionOptions);
}
