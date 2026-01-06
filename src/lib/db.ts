import { sql } from "@vercel/postgres";

export { sql };

export async function dbHealthcheck() {
  const result = await sql`SELECT 1 as ok`;
  return result.rows[0]?.ok === 1;
}
