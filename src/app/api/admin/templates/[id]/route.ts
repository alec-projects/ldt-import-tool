import { deleteTemplate, ensureSchema } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return Response.json({ error: "Invalid template id." }, { status: 400 });
  }

  await ensureSchema();
  await deleteTemplate(id);

  return Response.json({ ok: true });
}
