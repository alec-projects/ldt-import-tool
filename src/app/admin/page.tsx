"use client";

import { useEffect, useState } from "react";

type Template = {
  id: number;
  name: string;
  event_name: string;
  race_name: string;
  ticket_name: string;
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<{ id: number; email: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [templateUploadStatus, setTemplateUploadStatus] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [templateEvent, setTemplateEvent] = useState("");
  const [templateRace, setTemplateRace] = useState("");
  const [templateTicket, setTemplateTicket] = useState("");
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    async function checkSession() {
      const response = await fetch("/api/admin/me");
      const data = await response.json();
      setLoggedIn(Boolean(data.loggedIn));
      setChecking(false);
    }

    checkSession().catch(() => {
      setChecking(false);
    });
  }, []);

  async function fetchSettingsAndTemplates() {
    const [settingsRes, templatesRes, adminsRes] = await Promise.all([
      fetch("/api/admin/settings"),
      fetch("/api/admin/templates"),
      fetch("/api/admin/users"),
    ]);

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setRecipientEmail(data.recipientEmail ?? "");
    }

    if (templatesRes.ok) {
      const data = await templatesRes.json();
      setTemplates(data.templates ?? []);
    }

    if (adminsRes.ok) {
      const data = await adminsRes.json();
      setAdmins(data.admins ?? []);
    }
  }

  useEffect(() => {
    if (loggedIn) {
      fetchSettingsAndTemplates().catch(() => {
        setError("Failed to load settings.");
      });
    }
  }, [loggedIn]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const raw = await response.text();
    const data = raw ? (JSON.parse(raw) as { error?: string }) : {};
    if (!response.ok) {
      setLoginError(data.error || "Login failed.");
      return;
    }

    setLoggedIn(true);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
  }

  async function handleSettingsSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientEmail }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Failed to save settings.");
      return;
    }

    setStatus("Settings saved.");
  }

  async function handleTemplateUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setTemplateUploadStatus(null);

    const formData = new FormData();
    if (!templateEvent || !templateRace || !templateTicket) {
      setError("Event, race, and ticket are required.");
      return;
    }
    if (!templateFileName) {
      setError("Please choose a template CSV file.");
      return;
    }
    formData.append("eventName", templateEvent);
    formData.append("raceName", templateRace);
    formData.append("ticketName", templateTicket);
    formData.append("name", templateName);
    const fileInput = document.getElementById("template-file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Please choose a template CSV file.");
      return;
    }
    formData.append("file", file);
    const response = await fetch("/api/admin/templates", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Failed to upload template.");
      return;
    }

    setStatus("Template uploaded.");
    setTemplateUploadStatus("Upload successful");
    setTemplateEvent("");
    setTemplateRace("");
    setTemplateTicket("");
    setTemplateName("");
    setTemplateFileName(null);
    if (fileInput) {
      fileInput.value = "";
    }
    fetchSettingsAndTemplates().catch(() => {
      setError("Failed to refresh templates.");
    });
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (!inviteEmail) {
      setError("Invite email is required.");
      return;
    }

    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });

    const raw = await response.text();
    const data = raw ? (JSON.parse(raw) as { error?: string; id?: string }) : {};
    if (!response.ok) {
      setError(data.error || "Failed to send invite.");
      return;
    }

    setStatus(data.id ? `Invite sent (id: ${data.id}).` : "Invite sent.");
    setInviteEmail("");
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white/70 p-6">
          <p className="text-sm text-[color:var(--ink-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
            Admin login
          </h1>
          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
            Sign in to manage templates and email settings.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              />
            </div>
            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[color:var(--foreground)]">
              Admin settings
            </h1>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Manage template uploads and email delivery.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Sign out
          </button>
        </header>

        <section className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
            Email delivery
          </h2>
          <form onSubmit={handleSettingsSave} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Recipient email
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Save settings
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
            Upload template CSV
          </h2>
          <form onSubmit={handleTemplateUpload} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  Event name
                </label>
                <input
                  name="eventName"
                  required
                  value={templateEvent}
                  onChange={(event) => setTemplateEvent(event.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  Race name
                </label>
                <input
                  name="raceName"
                  required
                  value={templateRace}
                  onChange={(event) => setTemplateRace(event.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  Ticket name
                </label>
                <input
                  name="ticketName"
                  required
                  value={templateTicket}
                  onChange={(event) => setTemplateTicket(event.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                  Display name (optional)
                </label>
                <input
                  name="name"
                  placeholder="Event / Race / Ticket"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Template CSV file
              </label>
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]">
                Choose CSV file
                <input
                  id="template-file"
                  name="file"
                  type="file"
                  accept=".csv"
                  required
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    setTemplateFileName(nextFile?.name ?? null);
                    setTemplateUploadStatus(nextFile ? "Upload successful" : null);
                  }}
                  className="hidden"
                />
              </label>
              {templateFileName && (
                <p className="mt-2 text-sm text-[color:var(--foreground)]">
                  {templateFileName}
                </p>
              )}
              {templateUploadStatus && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--forest)]">
                  {templateUploadStatus}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Upload template
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
            Existing templates
          </h2>
          <div className="mt-4 space-y-2 text-sm text-[color:var(--ink-muted)]">
            {templates.length === 0 && <p>No templates uploaded yet.</p>}
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-[color:var(--foreground)]">
                    {template.name}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                    {template.event_name} / {template.race_name} / {template.ticket_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this template?")) return;
                    const response = await fetch(`/api/admin/templates/${template.id}`, {
                      method: "DELETE",
                    });
                    if (!response.ok) {
                      setError("Failed to delete template.");
                      return;
                    }
                    fetchSettingsAndTemplates().catch(() => {
                      setError("Failed to refresh templates.");
                    });
                  }}
                  className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
          <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
            Admin access
          </h2>
          <form onSubmit={handleInvite} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Invite admin by email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Send invite
            </button>
          </form>
          <div className="mt-6 space-y-2 text-sm text-[color:var(--ink-muted)]">
            {admins.length === 0 && <p>No admins added yet.</p>}
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-4 py-3"
              >
                <div className="font-medium text-[color:var(--foreground)]">
                  {admin.email}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Remove this admin?")) return;
                    const response = await fetch(`/api/admin/users/${admin.id}`, {
                      method: "DELETE",
                    });
                    if (!response.ok) {
                      setError("Failed to remove admin.");
                      return;
                    }
                    fetchSettingsAndTemplates().catch(() => {
                      setError("Failed to refresh admins.");
                    });
                  }}
                  className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Revoke access
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[color:var(--ink-muted)]">
            Invites expire after 24 hours.
          </p>
        </section>

        {status && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {status}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
