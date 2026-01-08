import { isAccessCodeValid } from "@/lib/access-code";
import { createImportLog, ensureSchema, getSetting, listTemplates } from "@/lib/db";
import { sendImportEmail } from "@/lib/email";
import { getClientIp, getRateLimitConfig, rateLimit } from "@/lib/rate-limit";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

type FieldValues = Record<string, string>;

function normalizeKey(value: string) {
  return value.replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRosterField(key: string) {
  const normalized = normalizeKey(key);
  return (
    normalized === "firstname" ||
    normalized === "lastname" ||
    normalized === "email"
  );
}

function findRosterHeader(headers: string[], type: "firstname" | "lastname" | "email") {
  for (const key of headers) {
    const normalized = normalizeKey(key);
    if (normalized === type) {
      return key;
    }
  }
  return null;
}

const importRateLimit = getRateLimitConfig("IMPORT_RATE_LIMIT", {
  windowMs: 60 * 60 * 1000,
  max: 25,
});

const DEFAULT_MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function resolveMaxImportBytes() {
  const parsed = Number(process.env.IMPORT_MAX_FILE_BYTES);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_IMPORT_BYTES;
  }
  return Math.floor(parsed);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`import:${ip}`, importRateLimit);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many imports. Try again later." },
      {
        status: 429,
        headers: limit.retryAfter
          ? { "Retry-After": String(limit.retryAfter) }
          : undefined,
      },
    );
  }

  await ensureSchema();

  const configuredAccessCode = await getSetting("homepage_access_code");
  const providedAccessCode = request.headers.get("x-access-code");
  if (!isAccessCodeValid(configuredAccessCode, providedAccessCode)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const templateId = Number(formData.get("templateId"));
  const file = formData.get("file");
  const fieldsRaw = String(formData.get("fields") ?? "{}");

  if (!templateId || Number.isNaN(templateId)) {
    return Response.json({ error: "Template is required." }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "CSV file is required." }, { status: 400 });
  }

  const maxImportBytes = resolveMaxImportBytes();
  if (file.size === 0) {
    return Response.json({ error: "CSV file is empty." }, { status: 400 });
  }
  if (file.size > maxImportBytes) {
    return Response.json({ error: "CSV file is too large." }, { status: 413 });
  }

  let fieldValues: FieldValues = {};
  try {
    const parsed = JSON.parse(fieldsRaw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid field values.");
    }
    fieldValues = parsed as FieldValues;
  } catch {
    return Response.json({ error: "Invalid field values." }, { status: 400 });
  }

  const templates = await listTemplates();
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    return Response.json({ error: "Template not found." }, { status: 404 });
  }

  const text = await file.text();
  const delimiter =
    text.includes("\t") && !text.includes(",") ? "\t" : ",";
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      delimiter,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    return Response.json({ error: "Unable to parse CSV file." }, { status: 400 });
  }

  if (records.length === 0) {
    return Response.json({ error: "CSV has no rows." }, { status: 400 });
  }

  const rowCount = records.length;
  const fileName = file.name;
  const templateColumns = Array.isArray(template.columns)
    ? template.columns
    : [];
  const requiredColumns = new Set(
    Array.isArray(template.required_columns) ? template.required_columns : [],
  );

  const headers = Object.keys(records[0] ?? {});
  const firstHeader = findRosterHeader(headers, "firstname");
  const lastHeader = findRosterHeader(headers, "lastname");
  const emailHeader = findRosterHeader(headers, "email");

  if (!firstHeader || !lastHeader || !emailHeader) {
    return Response.json(
      {
        error:
          "CSV must include First Name, Last Name, and Email columns (any common header variation is accepted).",
      },
      { status: 400 },
    );
  }

  const missingRequiredFields = templateColumns
    .filter((column) => requiredColumns.has(column))
    .filter((column) => !isRosterField(column))
    .filter((column) => (fieldValues[column]?.trim() ?? "") === "");

  if (missingRequiredFields.length > 0) {
    return Response.json(
      { error: `Missing required fields: ${missingRequiredFields.join(", ")}` },
      { status: 400 },
    );
  }

  let status: "success" | "error" = "success";
  let errorMessage: string | undefined;

  try {
    const outputRows = records.map((row) => {
      return templateColumns.map((column) => {
        const normalized = normalizeKey(column);
        if (normalized === "firstname") {
          return String(row[firstHeader] ?? "").trim();
        }
        if (normalized === "lastname") {
          return String(row[lastHeader] ?? "").trim();
        }
        if (normalized === "email") {
          return String(row[emailHeader] ?? "").trim();
        }
        return fieldValues[column] ?? "";
      });
    });

    for (const [index, row] of outputRows.entries()) {
      for (const [colIndex, value] of row.entries()) {
        const columnName = templateColumns[colIndex];
        const isRequired =
          requiredColumns.has(columnName) ||
          normalizeKey(columnName) === "firstname" ||
          normalizeKey(columnName) === "lastname" ||
          normalizeKey(columnName) === "email";
        if (isRequired && String(value).trim() === "") {
          throw new Error(
            `Row ${index + 1} is missing a required value for ${columnName}.`,
          );
        }
      }
    }

    const outputColumns = templateColumns.map((column) => {
      const normalized = normalizeKey(column);
      if (normalized === "email") {
        return "Email Address";
      }
      return column;
    });

    const csvOutput = stringify(outputRows, {
      header: true,
      columns: outputColumns,
    });

    const recipientEmail =
      (await getSetting("import_recipient_email")) ?? "";
    if (!recipientEmail) {
      throw new Error("Recipient email is not configured.");
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const outputFileName = `import-${timestamp}.csv`;
    const recipients = [recipientEmail];
    await sendImportEmail({
      to: recipients,
      subject: `Participant Import (${template.event_name} / ${template.race_name} / ${template.ticket_name})`,
      text: `Attached is the generated import file for ${template.name}.`,
      filename: outputFileName,
      content: Buffer.from(csvOutput),
    });

    await createImportLog({
      fileName,
      rowCount,
      templateId: template.id,
      eventName: template.event_name,
      raceName: template.race_name,
      ticketName: template.ticket_name,
      status: "success",
      recipientEmail,
    });

    return Response.json({
      ok: true,
      rowCount,
    });
  } catch (error) {
    status = "error";
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    await createImportLog({
      fileName,
      rowCount,
      templateId: template.id,
      eventName: template.event_name,
      raceName: template.race_name,
      ticketName: template.ticket_name,
      status,
      recipientEmail: await getSetting("import_recipient_email"),
      errorMessage,
    });
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
