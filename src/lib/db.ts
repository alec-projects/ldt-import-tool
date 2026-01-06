import { sql } from "@vercel/postgres";

export { sql };

export async function dbHealthcheck() {
  const result = await sql`SELECT 1 as ok`;
  return result.rows[0]?.ok === 1;
}

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      event_name TEXT NOT NULL,
      race_name TEXT NOT NULL,
      ticket_name TEXT NOT NULL,
      columns JSONB NOT NULL,
      required_columns JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS import_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_name TEXT,
      row_count INTEGER NOT NULL,
      template_id INTEGER REFERENCES templates(id),
      event_name TEXT,
      race_name TEXT,
      ticket_name TEXT,
      status TEXT NOT NULL,
      recipient_email TEXT,
      client_email TEXT,
      error_message TEXT
    )
  `;
  await sql`
    ALTER TABLE import_logs
    ADD COLUMN IF NOT EXISTS client_email TEXT
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_invites (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export type TemplateRecord = {
  id: number;
  name: string;
  event_name: string;
  race_name: string;
  ticket_name: string;
  columns: string[];
  required_columns: string[];
};

export type AdminUserRecord = {
  id: number;
  email: string;
  password_hash: string;
};

export type AdminInviteRecord = {
  id: number;
  email: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
};

export type ImportLogCreate = {
  fileName?: string;
  rowCount: number;
  templateId?: number;
  eventName?: string;
  raceName?: string;
  ticketName?: string;
  status: "success" | "error";
  recipientEmail?: string;
  clientEmail?: string;
  errorMessage?: string;
};

export async function listTemplates() {
  const result = await sql<TemplateRecord>`
    SELECT id, name, event_name, race_name, ticket_name, columns, required_columns
    FROM templates
    ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function createTemplate(input: {
  name: string;
  eventName: string;
  raceName: string;
  ticketName: string;
  columns: string[];
  requiredColumns: string[];
}) {
  const result = await sql<TemplateRecord>`
    INSERT INTO templates (name, event_name, race_name, ticket_name, columns, required_columns)
    VALUES (
      ${input.name},
      ${input.eventName},
      ${input.raceName},
      ${input.ticketName},
      ${JSON.stringify(input.columns)}::jsonb,
      ${JSON.stringify(input.requiredColumns)}::jsonb
    )
    RETURNING id, name, event_name, race_name, ticket_name, columns, required_columns
  `;
  return result.rows[0];
}

export async function deleteTemplate(id: number) {
  await sql`
    DELETE FROM templates WHERE id = ${id}
  `;
}

export async function listAdminUsers() {
  const result = await sql<AdminUserRecord>`
    SELECT id, email, password_hash
    FROM admin_users
    ORDER BY created_at DESC
  `;
  return result.rows;
}

export async function getAdminByEmail(email: string) {
  const result = await sql<AdminUserRecord>`
    SELECT id, email, password_hash
    FROM admin_users
    WHERE email = ${email}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function createAdminUser(email: string, passwordHash: string) {
  const result = await sql<AdminUserRecord>`
    INSERT INTO admin_users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, password_hash
  `;
  return result.rows[0];
}

export async function deleteAdminUser(id: number) {
  await sql`
    DELETE FROM admin_users WHERE id = ${id}
  `;
}

export async function createAdminInvite(input: {
  email: string;
  token: string;
  expiresAt: Date;
}) {
  const result = await sql<AdminInviteRecord>`
    INSERT INTO admin_invites (email, token, expires_at)
    VALUES (${input.email}, ${input.token}, ${input.expiresAt.toISOString()})
    RETURNING id, email, token, expires_at, used_at
  `;
  return result.rows[0];
}

export async function getInviteByToken(token: string) {
  const result = await sql<AdminInviteRecord>`
    SELECT id, email, token, expires_at, used_at
    FROM admin_invites
    WHERE token = ${token}
    LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function markInviteUsed(id: number) {
  await sql`
    UPDATE admin_invites
    SET used_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getSetting(key: string) {
  const result = await sql<{ value: string }>`
    SELECT value FROM settings WHERE key = ${key}
  `;
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await sql`
    INSERT INTO settings (key, value)
    VALUES (${key}, ${value})
    ON CONFLICT (key)
    DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}

export async function createImportLog(input: ImportLogCreate) {
  await sql`
    INSERT INTO import_logs (
      file_name,
      row_count,
      template_id,
      event_name,
      race_name,
      ticket_name,
      status,
      recipient_email,
      client_email,
      error_message
    )
    VALUES (
      ${input.fileName ?? null},
      ${input.rowCount},
      ${input.templateId ?? null},
      ${input.eventName ?? null},
      ${input.raceName ?? null},
      ${input.ticketName ?? null},
      ${input.status},
      ${input.recipientEmail ?? null},
      ${input.clientEmail ?? null},
      ${input.errorMessage ?? null}
    )
  `;
}
