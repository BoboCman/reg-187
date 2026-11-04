"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Plus } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

interface AppNavProps {
  /** Slot rendered between the brand and the right-side actions. */
  centerSlot?: React.ReactNode;
  /** Slot rendered on the right, before sign-out. */
  rightSlot?: React.ReactNode;
  /** Suppress the "New letter" button (e.g. when already in the profiler). */
  hideNewIntake?: boolean;
}

const LINKS = [
  { href: "/dashboard", label: "Letters", match: (p: string) => p === "/dashboard" || p.startsWith("/cases") },
  { href: "/settings/branding", label: "Letterhead", match: (p: string) => p.startsWith("/settings") },
];

export function AppNav({ centerSlot, rightSlot, hideNewIntake }: AppNavProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const inProfiler = pathname.startsWith("/app");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-[var(--color-surface)]/90 backdrop-blur border-b border-[var(--color-border)] sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <BrandMark href="/dashboard" size="sm" />

        {!centerSlot && (
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main">
            {LINKS.map((l) => {
              const active = l.match(pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "text-[var(--color-text-primary)] font-semibold bg-[var(--color-readonly-bg)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}

        {centerSlot ? <div className="flex-1 min-w-0">{centerSlot}</div> : <div className="flex-1" />}

        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          {!hideNewIntake && !inProfiler && (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New letter</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}
          {inProfiler && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] px-3 py-1.5 rounded-md"
            >
              Letters
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-readonly-bg)] transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
