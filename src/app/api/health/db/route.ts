import { dbHealthcheck } from "@/lib/db";

export async function GET() {
  try {
    const ok = await dbHealthcheck();
    return Response.json({ ok });
  } catch (error) {
    return Response.json({ ok: false }, { status: 500 });
  }
}
