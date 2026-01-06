import { ensureSchema, listAdminUsers } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const admins = await listAdminUsers();
  return Response.json({ admins });
}
