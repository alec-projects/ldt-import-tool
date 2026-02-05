import { isAccessCodeValid } from "@/lib/access-code";
import { createImportLog, ensureSchema, getSetting, listTemplates } from "@/lib/db";
import { sendImportEmail } from "@/lib/email";
import { getClientIp, getRateLimitConfig, rateLimit } from "@/lib/rate-limit";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { mapTemplateColumns, normalizeKey } from "@/lib/import-mapping";

type FieldValues = Record<string, string>;
const YEAR_FIRST_DATE_PATTERN = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(.*)$/;
const DAY_MONTH_YEAR_PATTERN = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(.*)$/;
const DAY_FIRST_HINT = /dd[./-]mm/i;
const MONTH_FIRST_HINT = /mm[./-]dd/i;

function isBookedAtField(column: string) {
  return normalizeKey(column).includes("bookedat");
}

function isBirthDateField(column: string) {
  const normalized = normalizeKey(column);
  return (
    normalized === "dob" ||
    normalized.includes("dateofbirth") ||
    normalized.includes("birthdate")
  );
}

function formatOutputHeader(column: string) {
  const normalized = normalizeKey(column);
  if (normalized === "email") {
    return "#email";
  }
  return column;
}

function normalizeYear(raw: string) {
  if (raw.length === 2) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return numeric >= 70 ? `19${raw}` : `20${raw}`;
    }
  }
  return raw;
}

function isValidDateParts(day: number, month: number) {
  return Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

function formatDateValue(value: string, column: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const hasDayFirstHint = DAY_FIRST_HINT.test(column);
  const hasMonthFirstHint = MONTH_FIRST_HINT.test(column);
  const defaultMonthFirst = isBookedAtField(column);
  let outputMonthFirst =
    hasMonthFirstHint && !hasDayFirstHint
      ? true
      : hasDayFirstHint && !hasMonthFirstHint
        ? false
        : defaultMonthFirst;
  if (isBirthDateField(column)) {
    outputMonthFirst = false;
  }

  let match = trimmed.match(YEAR_FIRST_DATE_PATTERN);
  if (match) {
    const [, year, month, day, rest] = match;
    const dayNum = Number(day);
    const monthNum = Number(month);
    if (!isValidDateParts(dayNum, monthNum)) {
      return value;
    }
    if (outputMonthFirst) {
      return `${String(monthNum).padStart(2, "0")}/${String(dayNum).padStart(2, "0")}/${normalizeYear(year)}${rest}`;
    }
    return `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${normalizeYear(year)}${rest}`;
  }

  match = trimmed.match(DAY_MONTH_YEAR_PATTERN);
  if (match) {
    const [, part1, part2, yearRaw, rest] = match;
    const num1 = Number(part1);
    const num2 = Number(part2);
    let day = part1;
    let month = part2;

    if (hasDayFirstHint && !hasMonthFirstHint) {
      day = part1;
      month = part2;
    } else if (hasMonthFirstHint && !hasDayFirstHint) {
      day = part2;
      month = part1;
    } else if (num1 > 12 && num2 <= 12) {
      day = part1;
      month = part2;
    } else if (num2 > 12 && num1 <= 12) {
      day = part2;
      month = part1;
    } else if (outputMonthFirst) {
      day = part2;
      month = part1;
    } else {
      day = part1;
      month = part2;
    }

    const dayNum = Number(day);
    const monthNum = Number(month);
    if (!isValidDateParts(dayNum, monthNum)) {
      return value;
    }

    if (outputMonthFirst) {
      return `${String(monthNum).padStart(2, "0")}/${String(dayNum).padStart(2, "0")}/${normalizeYear(yearRaw)}${rest}`;
    }
    return `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${normalizeYear(yearRaw)}${rest}`;
  }

  return value;
}

function formatOutputValue(column: string, value: string) {
  return formatDateValue(value, column);
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
  const delivery = String(formData.get("delivery") ?? "email").toLowerCase();
  const wantsDownload = delivery === "download";

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
  const columnToHeader = mapTemplateColumns(templateColumns, headers);

  const missingRequiredFields = templateColumns
    .filter((column) => requiredColumns.has(column))
    .filter((column) => !columnToHeader[column])
    .filter((column) => (fieldValues[column]?.trim() ?? "") === "");

  if (missingRequiredFields.length > 0) {
    return Response.json(
      {
        error:
          "Missing required fields (not found in upload, and no default provided): " +
          missingRequiredFields.join(", "),
      },
      { status: 400 },
    );
  }

  let status: "success" | "error" = "success";
  let errorMessage: string | undefined;

  try {
    const outputRows = records.map((row) =>
      templateColumns.map((column) => {
        const header = columnToHeader[column];
        let value = "";
        if (header) {
          value = String(row[header] ?? "").trim();
        } else {
          value = fieldValues[column] ?? "";
        }
        return formatOutputValue(column, value);
      }),
    );

    for (const [index, row] of outputRows.entries()) {
      for (const [colIndex, value] of row.entries()) {
        const columnName = templateColumns[colIndex];
        const isRequired = requiredColumns.has(columnName);
        if (isRequired && String(value).trim() === "") {
          throw new Error(
            `Row ${index + 1} is missing a required value for ${columnName}.`,
          );
        }
      }
    }

    const outputColumns = templateColumns.map((column) => formatOutputHeader(column));

    const csvOutput = stringify(outputRows, {
      header: true,
      columns: outputColumns,
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const outputFileName = `import-${timestamp}.csv`;
    let recipientEmail: string | undefined;
    if (!wantsDownload) {
      recipientEmail = (await getSetting("import_recipient_email")) ?? "";
      if (!recipientEmail) {
        throw new Error("Recipient email is not configured.");
      }
      const recipients = [recipientEmail];
      await sendImportEmail({
        to: recipients,
        subject: `Participant Import (${template.event_name} / ${template.race_name} / ${template.ticket_name})`,
        text: `Attached is the generated import file for ${template.name}.`,
        filename: outputFileName,
        content: Buffer.from(csvOutput),
      });
    }

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

    if (wantsDownload) {
      return new Response(csvOutput, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${outputFileName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

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
