import { ensureSchema, getSetting, setSetting } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const recipientEmail = await getSetting("import_recipient_email");

  return Response.json({ recipientEmail });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    recipientEmail?: string;
  };

  if (!body.recipientEmail) {
    return Response.json({ error: "Recipient email is required." }, { status: 400 });
  }

  await ensureSchema();
  await setSetting("import_recipient_email", body.recipientEmail.trim());

  return Response.json({ ok: true });
}
