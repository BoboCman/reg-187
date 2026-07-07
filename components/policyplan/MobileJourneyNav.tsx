"use client";
import React, { useState } from "react";
import { Check, Lock, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stage {
  num: number;
  label: string;
  chapter: string;
}

interface Props {
  stages: Stage[];
  activeStage: number;
  currentPanel: number;
  onSelect: (num: number) => void;
}

type StageStatus = "done" | "active" | "locked";

function getStatus(num: number, activeStage: number): StageStatus {
  if (num < activeStage) return "done";
  if (num === activeStage) return "active";
  return "locked";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MobileJourneyNav({ stages, activeStage, currentPanel, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const current = stages.find((s) => s.num === currentPanel) ?? stages[0];
  const chapter = current?.chapter ?? "";

  function handleSelect(num: number) {
    onSelect(num);
    setOpen(false);
  }

  return (
    <div className="md:hidden mb-4">
      {/* Compact bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-journey-sheet"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Current stage indicator dot */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[11px] font-semibold">
            {currentPanel}
          </span>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] leading-none mb-0.5">
              {chapter}
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {current?.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            Stage {currentPanel} of {stages.length}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Stage sheet — inline dropdown */}
      {open && (
        <div
          id="mobile-journey-sheet"
          role="dialog"
          aria-label="Case stages"
          className="mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden"
        >
          {/* Sheet header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Case stages
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-0.5"
              aria-label="Close stage list"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stage list */}
          <ol className="divide-y divide-[var(--color-border)]">
            {stages.map(({ num, label, chapter: stageChapter }) => {
              const status = getStatus(num, activeStage);
              const isClickable = status === "done" || status === "active";
              const isCurrent = currentPanel === num;

              return (
                <li key={num}>
                  <button
                    type="button"
                    onClick={() => isClickable && handleSelect(num)}
                    disabled={!isClickable}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 transition-colors text-left",
                      isCurrent
                        ? "bg-[var(--color-accent-light)]"
                        : isClickable
                        ? "hover:bg-[var(--color-readonly-bg)]"
                        : "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {/* Stage dot */}
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold border",
                        status === "done" &&
                          "bg-[var(--color-accent)] border-[var(--color-accent)] text-white",
                        status === "active" &&
                          "bg-[var(--color-accent)] border-[var(--color-accent)] text-white",
                        status === "locked" &&
                          "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-disabled)]"
                      )}
                    >
                      {status === "done" ? (
                        <Check size={13} strokeWidth={2.5} />
                      ) : status === "locked" ? (
                        <Lock size={12} strokeWidth={2} />
                      ) : (
                        num
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm leading-tight",
                          isCurrent
                            ? "font-semibold text-[var(--color-accent)]"
                            : status === "done"
                            ? "text-[var(--color-text-secondary)]"
                            : status === "active"
                            ? "font-semibold text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-muted)]"
                        )}
                      >
                        {label}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 uppercase tracking-widest">
                        {stageChapter}
                      </p>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent)] shrink-0">
                        Current
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
