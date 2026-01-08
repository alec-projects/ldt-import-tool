"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Template = {
  id: number;
  name: string;
  event_name: string;
  race_name: string;
  ticket_name: string;
  columns: string[];
  required_columns: string[];
};

type FieldValues = Record<string, string>;

type TemplateOption = {
  id: number;
  name: string;
  event: string;
  race: string;
  ticket: string;
  columns: string[];
  requiredColumns: string[];
};

type AccessState = "loading" | "locked" | "unlocked";

const ACCESS_CODE_STORAGE_KEY = "ldt_access_code";
const EMAIL_ALIASES = new Set(["email", "emailaddress", "emailaddr"]);
const FIRST_NAMES = [
  "Avery",
  "Jordan",
  "Casey",
  "Taylor",
  "Riley",
  "Morgan",
  "Drew",
  "Hayden",
  "Logan",
  "Parker",
];
const LAST_NAMES = [
  "Reed",
  "Parker",
  "Carter",
  "Bailey",
  "Bennett",
  "Murphy",
  "Foster",
  "Hayes",
  "Coleman",
  "Sutton",
];
const STREET_NAMES = ["Main", "Oak", "Pine", "Cedar", "Maple", "Elm", "Sunset", "Ridge"];
const STREET_SUFFIXES = ["St", "Ave", "Rd", "Ln", "Blvd", "Dr", "Way"];
const CITIES = [
  "Springfield",
  "Riverton",
  "Fairview",
  "Madison",
  "Georgetown",
  "Franklin",
  "Clinton",
  "Arlington",
];
const STATES = ["CA", "NY", "TX", "FL", "IL", "WA", "CO", "NC", "GA", "AZ"];
const COMPANY_NAMES = [
  "Acme Events",
  "Summit Athletics",
  "Northstar Sports",
  "Pioneer Running Club",
  "Blue Ridge Racing",
];
const TEAM_NAMES = ["Team Falcon", "Team Horizon", "Team Summit", "Team Canyon"];
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL"];

type GeneratedProfile = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  company: string;
  team: string;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)] ?? items[0];
}

function randomDateISO(start: Date, end: Date) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const timestamp = startMs + Math.random() * (endMs - startMs);
  return new Date(timestamp).toISOString().slice(0, 10);
}

function randomPhone() {
  const area = randomInt(201, 989);
  const prefix = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `${area}-${prefix}-${line}`;
}

function randomPostalCode() {
  return String(randomInt(10000, 99999));
}

function randomAddress() {
  const number = randomInt(100, 9999);
  return `${number} ${randomFrom(STREET_NAMES)} ${randomFrom(STREET_SUFFIXES)}`;
}

function createGeneratedProfile(): GeneratedProfile {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const emailToken = randomInt(10, 99);
  return {
    firstName,
    lastName,
    fullName,
    email: `${firstName}.${lastName}${emailToken}@example.com`.toLowerCase(),
    phone: randomPhone(),
    address: randomAddress(),
    address2: `Apt ${randomInt(1, 40)}`,
    city: randomFrom(CITIES),
    state: randomFrom(STATES),
    postalCode: randomPostalCode(),
    country: "United States",
    company: randomFrom(COMPANY_NAMES),
    team: randomFrom(TEAM_NAMES),
  };
}

function normalizeKey(value: string) {
  const normalized = value
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (EMAIL_ALIASES.has(normalized)) {
    return "email";
  }
  return normalized;
}

function isRosterField(column: string) {
  const normalized = normalizeKey(column);
  return normalized === "firstname" || normalized === "lastname" || normalized === "email";
}

export default function Home() {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTemplates = useCallback(async (code: string) => {
    setAccessState("loading");
    setAccessError(null);
    const headers: HeadersInit = {};
    if (code) {
      headers["x-access-code"] = code;
    }

    try {
      const response = await fetch("/api/templates", { headers });
      if (response.status === 401) {
        setAccessState("locked");
        setTemplates([]);
        setSelectedEvent("");
        setSelectedRace("");
        setSelectedTicket("");
        setAccessError(code ? "Access code not recognized." : "Access code required.");
        setError(null);
        window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
        return;
      }

      if (!response.ok) {
        setAccessState("unlocked");
        setTemplates([]);
        setError("Unable to load templates. Please try again later.");
        return;
      }

      const data = (await response.json()) as { templates: Template[] };
      const mapped = data.templates.map((template) => ({
        id: template.id,
        name: template.name,
        event: template.event_name,
        race: template.race_name,
        ticket: template.ticket_name,
        columns: template.columns,
        requiredColumns: template.required_columns,
      }));
      setTemplates(mapped);
      setAccessState("unlocked");
      setError(null);
      if (code) {
        window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
      } else {
        window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
      }
    } catch {
      setAccessState("unlocked");
      setError("Unable to load templates. Please try again later.");
    }
  }, []);

  useEffect(() => {
    const storedCode = window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? "";
    if (storedCode) {
      setAccessCode(storedCode);
    }
    loadTemplates(storedCode);
  }, [loadTemplates]);

  const events = useMemo(() => {
    return Array.from(new Set(templates.map((template) => template.event)));
  }, [templates]);

  const races = useMemo(() => {
    return Array.from(
      new Set(
        templates
          .filter((template) => template.event === selectedEvent)
          .map((template) => template.race),
      ),
    );
  }, [templates, selectedEvent]);

  const tickets = useMemo(() => {
    return Array.from(
      new Set(
        templates
          .filter(
            (template) =>
              template.event === selectedEvent && template.race === selectedRace,
          )
          .map((template) => template.ticket),
      ),
    );
  }, [templates, selectedEvent, selectedRace]);

  const selectedTemplate = useMemo(() => {
    return templates.find(
      (template) =>
        template.event === selectedEvent &&
        template.race === selectedRace &&
        template.ticket === selectedTicket,
    );
  }, [templates, selectedEvent, selectedRace, selectedTicket]);

  const extraFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.columns.filter((column) => !isRosterField(column));
  }, [selectedTemplate]);

  const requiredFields = useMemo(() => {
    return new Set(selectedTemplate?.requiredColumns ?? []);
  }, [selectedTemplate]);

  const requiredExtraFields = useMemo(() => {
    return extraFields.filter((column) => requiredFields.has(column));
  }, [extraFields, requiredFields]);

  function inputTypeForColumn(column: string) {
    const normalized = normalizeKey(column);
    if (
      normalized.includes("bookedat") ||
      normalized.includes("dateofbirth") ||
      normalized === "dob" ||
      normalized === "birthdate"
    ) {
      return "date";
    }
    return "text";
  }

  function selectOptionsForColumn(column: string) {
    const normalized = normalizeKey(column);
    if (normalized.includes("gender")) {
      return ["Male", "Female", "Prefer not to say"];
    }
    if (normalized.includes("ldtemailconsentoptout")) {
      return ["OptOut"];
    }
    return null;
  }

  function generateValueForColumn(
    column: string,
    options: string[] | null,
    profile: GeneratedProfile,
  ) {
    if (options && options.length > 0) {
      return randomFrom(options);
    }

    const normalized = normalizeKey(column);
    if (normalized.includes("event") && selectedEvent) {
      return selectedEvent;
    }
    if (normalized.includes("race") && selectedRace) {
      return selectedRace;
    }
    if (normalized.includes("ticket") && selectedTicket) {
      return selectedTicket;
    }

    if (
      normalized.includes("dateofbirth") ||
      normalized === "dob" ||
      normalized.includes("birthdate")
    ) {
      const end = new Date();
      end.setFullYear(end.getFullYear() - 18);
      const start = new Date();
      start.setFullYear(start.getFullYear() - 65);
      return randomDateISO(start, end);
    }

    if (inputTypeForColumn(column) === "date") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return randomDateISO(start, end);
    }

    if (normalized.includes("firstname")) {
      return profile.firstName;
    }
    if (normalized.includes("lastname")) {
      return profile.lastName;
    }
    if (normalized.includes("name")) {
      return profile.fullName;
    }
    if (normalized.includes("email")) {
      return profile.email;
    }
    if (
      normalized.includes("phone") ||
      normalized.includes("mobile") ||
      normalized.includes("number") ||
      normalized.includes("tel")
    ) {
      return profile.phone;
    }
    if (
      normalized.includes("address2") ||
      normalized.includes("apt") ||
      normalized.includes("suite")
    ) {
      return profile.address2;
    }
    if (normalized.includes("address") || normalized.includes("street")) {
      return profile.address;
    }
    if (normalized.includes("city")) {
      return profile.city;
    }
    if (normalized.includes("state") || normalized.includes("province")) {
      return profile.state;
    }
    if (normalized.includes("zip") || normalized.includes("postal")) {
      return profile.postalCode;
    }
    if (normalized.includes("country")) {
      return profile.country;
    }
    if (
      normalized.includes("company") ||
      normalized.includes("organization") ||
      normalized.includes("employer")
    ) {
      return profile.company;
    }
    if (normalized.includes("team") || normalized.includes("club")) {
      return profile.team;
    }
    if (
      normalized.includes("shirt") ||
      normalized.includes("tshirt") ||
      normalized.includes("size")
    ) {
      return randomFrom(SHIRT_SIZES);
    }
    if (normalized.includes("age")) {
      return String(randomInt(18, 70));
    }
    if (normalized.includes("id")) {
      return `ID${randomInt(10000, 99999)}`;
    }
    if (
      normalized.includes("consent") ||
      normalized.includes("agree") ||
      normalized.includes("waiver")
    ) {
      return "Yes";
    }
    if (normalized.includes("notes") || normalized.includes("comment")) {
      return "Auto generated";
    }

    return `Auto-${randomInt(1000, 9999)}`;
  }

  function handleFieldChange(column: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [column]: value }));
  }

  function handleAutoGenerateRequired() {
    if (!selectedTemplate || requiredExtraFields.length === 0) return;
    const hasExistingValues = requiredExtraFields.some(
      (column) => (fieldValues[column]?.trim() ?? "") !== "",
    );
    if (hasExistingValues && !confirm("Overwrite existing required field values?")) {
      return;
    }

    const profile = createGeneratedProfile();
    setFieldValues((prev) => {
      const next = { ...prev };
      for (const column of requiredExtraFields) {
        if (!hasExistingValues && (prev[column]?.trim() ?? "") !== "") {
          continue;
        }
        next[column] = generateValueForColumn(
          column,
          selectOptionsForColumn(column),
          profile,
        );
      }
      return next;
    });
  }

  async function handleAccessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = accessCode.trim();
    setAccessCode(trimmed);
    await loadTemplates(trimmed);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!file) {
      setError("Please upload a CSV roster file.");
      return;
    }

    if (!selectedTemplate) {
      setError("Please select event, race, and ticket.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("templateId", String(selectedTemplate.id));
      formData.append("file", file);
      formData.append("fields", JSON.stringify(fieldValues));

      const headers: HeadersInit = {};
      if (accessCode) {
        headers["x-access-code"] = accessCode;
      }

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
        headers,
      });

      if (response.status === 401) {
        setAccessState("locked");
        setAccessError("Access code required.");
        window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Import failed.");
      }

      setStatus("Import sent. Your CSV has been emailed to the configured recipient.");
      setFieldValues({});
      setFile(null);
      setFileStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accessState === "loading") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <p className="text-sm text-[color:var(--ink-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (accessState === "locked") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
        <main className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
              Participant Import Builder
            </span>
            <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
              Enter access code
            </h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              This page is protected. Enter the shared code to continue.
            </p>
          </header>
          <form
            onSubmit={handleAccessSubmit}
            className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Access code
              </label>
              <input
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            {accessError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {accessError}
              </div>
            )}
            <button
              type="submit"
              className="mt-4 w-full rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Unlock
            </button>
          </form>
          <p className="text-xs text-[color:var(--ink-muted)]">
            Admin? Manage templates and settings at{" "}
            <a className="font-semibold text-[color:var(--foreground)] underline" href="/admin">
              admin
            </a>
            .
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)]">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
            Participant Import Builder
          </span>
          <h1 className="text-3xl font-semibold text-[color:var(--foreground)]">
            Import a participant roster
          </h1>
          <p className="text-sm text-[color:var(--ink-muted)]">
            Upload a CSV with First Name, Last Name, and Email. Select the event,
            race, and ticket, then fill the remaining fields once to generate a
            validated CSV. Nothing is saved after submission.
          </p>
        </header>

        <form
          className="flex flex-col gap-6 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
              Upload roster CSV
            </label>
            <div className="rounded-2xl border border-dashed border-black/20 bg-white/60 p-6">
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]">
                Choose CSV file
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    setFileStatus(nextFile ? "Upload successful" : null);
                  }}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-[color:var(--ink-muted)]">
                Required columns: First Name, Last Name, Email Address
              </p>
              {file && (
                <p className="mt-2 text-sm text-[color:var(--foreground)]">
                  {file.name}
                </p>
              )}
              {fileStatus && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--forest)]">
                  {fileStatus}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Select event
              </label>
              <select
                value={selectedEvent}
                onChange={(event) => {
                  setSelectedEvent(event.target.value);
                  setSelectedRace("");
                  setSelectedTicket("");
                }}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose event</option>
                {events.map((event) => (
                  <option key={event} value={event}>
                    {event}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Select race
              </label>
              <select
                value={selectedRace}
                onChange={(event) => {
                  setSelectedRace(event.target.value);
                  setSelectedTicket("");
                }}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                disabled={!selectedEvent}
              >
                <option value="">Choose race</option>
                {races.map((race) => (
                  <option key={race} value={race}>
                    {race}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Select ticket
              </label>
              <select
                value={selectedTicket}
                onChange={(event) => setSelectedTicket(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                disabled={!selectedRace}
              >
                <option value="">Choose ticket</option>
                {tickets.map((ticket) => (
                  <option key={ticket} value={ticket}>
                    {ticket}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 bg-[color:var(--sand)] px-4 py-3 text-sm text-[color:var(--ink-muted)]">
                Template selected: <span className="font-medium">{selectedTemplate.name}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  Only fields marked with * are required.
                </p>
                {requiredExtraFields.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateRequired}
                    className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                  >
                    Auto fill required
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {extraFields.map((column) => (
                  <div key={column} className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                      {column.replace(/^#+/, "")}
                      {requiredFields.has(column) ? " *" : ""}
                    </label>
                    {selectOptionsForColumn(column) ? (
                      <select
                        value={fieldValues[column] ?? ""}
                        onChange={(event) =>
                          handleFieldChange(column, event.target.value)
                        }
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                        required={requiredFields.has(column)}
                      >
                        <option value="">Select</option>
                        {selectOptionsForColumn(column)?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={inputTypeForColumn(column)}
                        value={fieldValues[column] ?? ""}
                        onChange={(event) => handleFieldChange(column, event.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                        required={requiredFields.has(column)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {status && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {status}
            </div>
          )}

          <button
            type="submit"
            className="flex items-center justify-center rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "Processing..." : "Generate & Email CSV"}
          </button>
        </form>
        <p className="text-xs text-[color:var(--ink-muted)]">
          Admin? Manage templates and settings at{" "}
          <a className="font-semibold text-[color:var(--foreground)] underline" href="/admin">
            admin
          </a>
          .
        </p>
      </main>
    </div>
  );
}
