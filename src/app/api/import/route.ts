import { createImportLog, ensureSchema, getSetting, listTemplates } from "@/lib/db";
import { sendImportEmail } from "@/lib/email";
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

export async function POST(request: Request) {
  await ensureSchema();

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


  let fieldValues: FieldValues = {};
  try {
    fieldValues = JSON.parse(fieldsRaw) as FieldValues;
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
  const records = parse(text, {
    columns: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return Response.json({ error: "CSV has no rows." }, { status: 400 });
  }

  const rowCount = records.length;
  const fileName = file.name;
  const requiredColumns = new Set(template.required_columns ?? []);

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

  const missingRequiredFields = template.columns
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
      return template.columns.map((column) => {
        const normalized = normalizeKey(column);
        if (normalized === "firstname") {
          return row[firstHeader]?.trim() ?? "";
        }
        if (normalized === "lastname") {
          return row[lastHeader]?.trim() ?? "";
        }
        if (normalized === "email") {
          return row[emailHeader]?.trim() ?? "";
        }
        return fieldValues[column] ?? "";
      });
    });

    for (const [index, row] of outputRows.entries()) {
      for (const [colIndex, value] of row.entries()) {
        const columnName = template.columns[colIndex];
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

    const outputColumns = template.columns.map((column) => {
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
