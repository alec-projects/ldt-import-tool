import { Suspense } from "react";
import AcceptInviteClient from "./accept-client";

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f9eddc_0%,#f7f3ee_48%,#efe6da_100%)] px-6 py-16">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-[color:var(--ink-muted)]">Loading invite…</p>
          </div>
        </div>
      }
    >
      <AcceptInviteClient />
    </Suspense>
  );
}
