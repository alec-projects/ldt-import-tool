"use client";

import { useEffect, useMemo, useState } from "react";

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

function normalizeKey(value: string) {
  return value.replace(/^#+/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRosterField(column: string) {
  const normalized = normalizeKey(column);
  return normalized === "firstname" || normalized === "lastname" || normalized === "email";
}

export default function Home() {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      const response = await fetch("/api/templates");
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
    }

    loadTemplates().catch(() => {
      setError("Unable to load templates. Please try again later.");
    });
  }, []);

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

  function handleFieldChange(column: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [column]: value }));
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

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Import failed.");
      }

      setStatus("Import sent. Your CSV has been emailed to the configured recipient.");
      setFieldValues({});
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
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
              <input
                type="file"
                accept=".csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-[color:var(--foreground)]"
              />
              <p className="mt-2 text-xs text-[color:var(--ink-muted)]">
                Required columns: First Name, Last Name, Email
              </p>
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
              <div className="grid gap-4 md:grid-cols-2">
                {extraFields.map((column) => (
                  <div key={column} className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                      {column.replace(/^#+/, "")}
                      {requiredFields.has(column) ? " *" : ""}
                    </label>
                    <input
                      type="text"
                      value={fieldValues[column] ?? ""}
                      onChange={(event) => handleFieldChange(column, event.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                      required={requiredFields.has(column)}
                    />
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
      </main>
    </div>
  );
}
