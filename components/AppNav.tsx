"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FilePlus, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppNavProps {
  /** Slot rendered between the brand and the right-side actions. */
  centerSlot?: React.ReactNode;
  /** Slot rendered on the right, before sign-out. */
  rightSlot?: React.ReactNode;
  /** Suppress the "New intake" button (e.g. when already in the profiler). */
  hideNewIntake?: boolean;
}

export function AppNav({ centerSlot, rightSlot, hideNewIntake }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const onDashboard = pathname === "/dashboard";
  const inProfiler = pathname?.startsWith("/app");

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

        {/* ── Brand ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-disabled)] hidden sm:block">
            IPAI
          </span>
          <ChevronRight className="w-3 h-3 text-[var(--color-text-disabled)] hidden sm:block" />
          <Link
            href="/dashboard"
            className={cn(
              "text-sm font-semibold transition-colors",
              onDashboard
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            PolicyPlan
          </Link>
        </div>

        {/* ── Breadcrumb trail (when in profiler) ── */}
        {inProfiler && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-border-strong)]" />
            <span className="font-medium text-[var(--color-text-secondary)]">
              New intake
            </span>
          </div>
        )}

        {/* ── Center slot (e.g. step counter + progress) ── */}
        {centerSlot && (
          <div className="flex-1 min-w-0">{centerSlot}</div>
        )}

        {/* ── Spacer when no center slot ── */}
        {!centerSlot && <div className="flex-1" />}

        {/* ── Right side ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Right slot (e.g. step indicator) */}
          {rightSlot}

          {/* Cases link — shown when inside the profiler */}
          {inProfiler && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1.5 rounded-md hover:bg-[var(--color-readonly-bg)]"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Cases
            </Link>
          )}

          {/* New intake button — shown on dashboard and case detail */}
          {!hideNewIntake && !inProfiler && (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New intake</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1.5 rounded-md hover:bg-[var(--color-readonly-bg)]"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
