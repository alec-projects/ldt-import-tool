import { isAccessCodeValid } from "@/lib/access-code";
import { ensureSchema, getSetting, listTemplates } from "@/lib/db";

export async function GET(request: Request) {
  await ensureSchema();
  const configuredAccessCode = await getSetting("homepage_access_code");
  const providedAccessCode = request.headers.get("x-access-code");
  if (!isAccessCodeValid(configuredAccessCode, providedAccessCode)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const templates = await listTemplates();
  return Response.json({ templates });
}
