import Link from "next/link";

export const metadata = {
  title: "Insurance Planner AI Professional",
  description: "Best-interest life insurance intake tools.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-text-muted)] mb-2">
            Insurance Planner AI Professional
          </p>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Intake tools
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Select a tool to begin a new client intake.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/policyplan"
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 hover:border-[var(--color-accent)] hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  PolicyPlan
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Seven-step best-interest intake. Needs-first order per Reg 187 / NAIC / CFP Board.
                  Design emphasis inferred, not ranked.
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  v2.0.0 — clean-room
                </p>
              </div>
              <span className="text-[var(--color-accent)] text-lg shrink-0 mt-0.5">→</span>
            </div>
          </Link>

          <Link
            href="/lidq"
            className="block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-text-secondary)]">
                  LIDQ
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Life Insurance Design Questionnaire — eight-step intake with advisor-ranked design priorities.
                </p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  v01.2020NY
                </p>
              </div>
              <span className="text-[var(--color-text-muted)] text-lg shrink-0 mt-0.5">→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
