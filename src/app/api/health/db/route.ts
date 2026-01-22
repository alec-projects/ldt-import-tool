import { dbHealthcheck } from "@/lib/db";

export async function GET() {
  try {
    const ok = await dbHealthcheck();
    return Response.json({ ok });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
