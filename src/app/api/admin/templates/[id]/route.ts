import { deleteTemplate, ensureSchema, updateTemplate } from "@/lib/db";
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

export async function PATCH(
  request: Request,
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

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    eventName?: string;
    raceName?: string;
    ticketName?: string;
  };

  const eventName = String(body.eventName ?? "").trim();
  const raceName = String(body.raceName ?? "").trim();
  const ticketName = String(body.ticketName ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!eventName || !raceName || !ticketName) {
    return Response.json(
      { error: "Event, race, and ticket are required." },
      { status: 400 },
    );
  }

  const templateName = name || `${eventName} / ${raceName} / ${ticketName}`;

  await ensureSchema();
  const template = await updateTemplate({
    id,
    name: templateName,
    eventName,
    raceName,
    ticketName,
  });

  if (!template) {
    return Response.json({ error: "Template not found." }, { status: 404 });
  }

  return Response.json({ template });
}
