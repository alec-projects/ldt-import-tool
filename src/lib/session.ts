import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = {
  adminEmail?: string;
};

const sessionOptions: SessionOptions = {
  cookieName: "ldt_admin_session",
  password:
    process.env.SESSION_PASSWORD ??
    "set-this-in-env-for-production-min-32-chars",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getAdminSession() {
  return getIronSession<AdminSession>(cookies(), sessionOptions);
}
