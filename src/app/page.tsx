export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 md:py-20">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
              Participant Import Builder
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-[color:var(--foreground)] md:text-5xl">
              Build a clean import file from a simple roster.
            </h1>
            <p className="text-base leading-relaxed text-[color:var(--ink-muted)] md:text-lg">
              Upload a CSV with First Name, Last Name, and Email. Choose the
              event, race, and ticket, fill the remaining fields once, and
              export a validated CSV ready for upload.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button className="rounded-full bg-[color:var(--forest)] px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:translate-y-[-1px] hover:bg-[#14523d]">
                Start Import
              </button>
              <button className="rounded-full border border-black/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)] transition hover:border-black/40">
                View Sample CSV
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-[color:var(--ink-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[color:var(--forest)]" />
                <span>Upload once</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[color:var(--clay)]" />
                <span>Fill remaining fields</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-black/60" />
                <span>Export instantly</span>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
            <div className="space-y-4 rounded-2xl border border-black/10 bg-[color:var(--sand)] p-6">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                <span>Roster Preview</span>
                <span>96 rows</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-[color:var(--foreground)]">
                <span>First Name</span>
                <span>Last Name</span>
                <span>Email</span>
              </div>
              <div className="space-y-2 text-sm text-[color:var(--ink-muted)]">
                <div className="grid grid-cols-3 gap-4">
                  <span>Jordan</span>
                  <span>Lee</span>
                  <span>jordan@example.com</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span>Cam</span>
                  <span>Diaz</span>
                  <span>cam@example.com</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span>Riley</span>
                  <span>Chen</span>
                  <span>riley@example.com</span>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-black/10 bg-white/80 p-4 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]">
                Event / Race / Ticket selected
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Upload Roster",
              detail:
                "Drop in a CSV with First Name, Last Name, Email. We auto-map headers.",
            },
            {
              title: "Complete Fields",
              detail:
                "Select the event, race, and ticket. Fill the remaining fields once.",
            },
            {
              title: "Download",
              detail:
                "Export a ready-to-import CSV. Nothing is saved after submission.",
            },
          ].map((step, index) => (
            <div
              key={step.title}
              className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.35)]"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--clay)]">
                Step {index + 1}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[color:var(--foreground)]">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                {step.detail}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">
              Fast, client-friendly, and permissionless.
            </h2>
            <p className="text-sm leading-relaxed text-[color:var(--ink-muted)]">
              Clients only see the tools they need: upload a roster, pick the
              event/race/ticket, complete the required fields, and export. All
              template management lives behind a gated settings page.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                "Simple CSV input",
                "Auto header mapping",
                "Validation before export",
                "No data stored",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-black/10 bg-[color:var(--forest)] p-6 text-white">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-white/70">
                Output Preview
              </div>
              <pre className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-white/80">
{`first_name,last_name,email,ticket_id,country
Jordan,Lee,jordan@example.com,123,US
Cam,Diaz,cam@example.com,123,US
Riley,Chen,riley@example.com,123,US`}
              </pre>
            </div>
            <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5 text-xs uppercase tracking-[0.2em] text-white/70">
              Generated instantly on submission
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
