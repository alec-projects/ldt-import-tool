import { dbHealthcheck } from "@/lib/db";

export async function GET() {
  try {
    const ok = await dbHealthcheck();
    return Response.json({ ok });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
