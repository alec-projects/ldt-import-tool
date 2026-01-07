import { createTemplate, ensureSchema, listTemplates } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { parse } from "csv-parse/sync";

const DEFAULT_MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;

function resolveMaxTemplateBytes() {
  const parsed = Number(process.env.TEMPLATE_MAX_FILE_BYTES);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_TEMPLATE_BYTES;
  }
  return Math.floor(parsed);
}

function extractColumns(content: string) {
  const trimmed = content.trim();
  const delimiter =
    trimmed.includes("\t") && !trimmed.includes(",") ? "\t" : ",";
  const records = parse(trimmed, {
    delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  const headerRow = records[0] ?? [];
  return headerRow.map((value) => value.trim()).filter(Boolean);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const templates = await listTemplates();
  return Response.json({ templates });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.adminEmail) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const name = String(formData.get("name") ?? "").trim();
  const eventName = String(formData.get("eventName") ?? "").trim();
  const raceName = String(formData.get("raceName") ?? "").trim();
  const ticketName = String(formData.get("ticketName") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Template CSV file is required." }, { status: 400 });
  }

  const maxTemplateBytes = resolveMaxTemplateBytes();
  if (file.size === 0) {
    return Response.json({ error: "Template CSV file is empty." }, { status: 400 });
  }
  if (file.size > maxTemplateBytes) {
    return Response.json(
      { error: "Template CSV file is too large." },
      { status: 413 },
    );
  }

  if (!eventName || !raceName || !ticketName) {
    return Response.json(
      { error: "Event, race, and ticket are required." },
      { status: 400 },
    );
  }

  const content = await file.text();
  const columns = extractColumns(content);
  if (columns.length === 0) {
    return Response.json({ error: "Template CSV has no columns." }, { status: 400 });
  }

  const requiredColumns = columns.filter((column) => column.startsWith("#"));
  const templateName =
    name || `${eventName} / ${raceName} / ${ticketName}`;

  await ensureSchema();
  const template = await createTemplate({
    name: templateName,
    eventName,
    raceName,
    ticketName,
    columns,
    requiredColumns,
  });

  return Response.json({ template });
}
