import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { policyPlanIntakeSchema } from "@/lib/policyplan/schema";
import { PPCaseReview } from "@/components/policyplan/PPCaseReview";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Case ${id.slice(0, 8)}… — PolicyPlan`,
  };
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Confirm session.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the single row — RLS enforces advisor_id = auth.uid(),
  // so a row belonging to another advisor returns nothing.
  const { data: row, error } = await supabase
    .from("policyplan_intakes")
    .select("id, created_at, payload")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  // Parse payload through the Zod schema.
  const parsed = policyPlanIntakeSchema.safeParse(row.payload);
  if (!parsed.success) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">
          This case record could not be parsed. It may have been created with an
          older schema version.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to cases</span>
            </Link>
            <span className="text-[var(--color-border)] select-none">|</span>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
                Insurance Planner AI Professional
              </p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                PolicyPlan — Case review
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)]">
            Read only
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PPCaseReview intake={parsed.data} caseId={row.id} />
      </main>
    </div>
  );
}
