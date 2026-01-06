import { ensureSchema, listTemplates } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const templates = await listTemplates();
  return Response.json({ templates });
}
