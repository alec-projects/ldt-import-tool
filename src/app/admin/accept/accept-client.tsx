"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInviteClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("Invite token missing.");
        return;
      }
      const response = await fetch(`/api/admin/invites/${token}`);
      const raw = await response.text();
      const data = raw ? (JSON.parse(raw) as { email?: string; error?: string }) : {};
      if (!response.ok) {
        setError(data.error || "Invite is invalid.");
        return;
      }
      setEmail(data.email ?? null);
    }

    loadInvite().catch(() => {
      setError("Unable to verify invite.");
    });
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/admin/invites/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const raw = await response.text();
    const data = raw ? (JSON.parse(raw) as { error?: string }) : {};
    if (!response.ok) {
      setError(data.error || "Unable to accept invite.");
      return;
    }

    setStatus("Password set. You can now log in at /admin.");
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
          Accept admin invite
        </h1>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          {email ? `Create a password for ${email}` : "Validating invite..."}
        </p>
        {email && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-[color:var(--forest)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]"
            >
              Set password
            </button>
          </form>
        )}
        {status && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {status}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
