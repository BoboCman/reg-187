"use client";
import React, { useState } from "react";
import { Copy, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentBodyMarkdown } from "./DocumentBodyMarkdown";

export type DocStatus = "draft" | "final" | "pending" | "error";
export type DocVariant = "advisor" | "client";

interface Props {
  title: string;
  subtitle?: string;
  body: string;
  variant?: DocVariant;
  status: DocStatus;
  generatedAt?: string | null;
  /** When true the body is initially collapsed to a max-height with a show-more affordance. */
  collapsible?: boolean;
  /** Extra actions rendered in the footer action zone. */
  actions?: React.ReactNode;
  className?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, { label: string; className: string }> = {
    draft: {
      label: "Draft",
      className:
        "border-amber-300 text-amber-700 bg-amber-50 print:border-amber-300 print:text-amber-700",
    },
    final: {
      label: "Final",
      className:
        "border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)]",
    },
    pending: {
      label: "Generating…",
      className: "border-[var(--color-border)] text-[var(--color-text-muted)] bg-transparent",
    },
    error: {
      label: "Error",
      className: "border-[var(--color-error)] text-[var(--color-error)] bg-[var(--color-error-light)]",
    },
  };

  const { label, className } = map[status] ?? map.draft;

  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border print:shadow-none",
        className
      )}
    >
      {label}
    </span>
  );
}

export function DocumentRenderer({
  title,
  subtitle,
  body,
  variant = "advisor",
  status,
  generatedAt,
  collapsible = false,
  actions,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(!collapsible);

  function handleCopy() {
    navigator.clipboard.writeText(body).catch(() => undefined);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]",
        "print:border-none print:shadow-none print:rounded-none",
        className
      )}
      aria-label={title}
    >
      {/* ── A. Header zone ──────────────────────────────────────────────── */}
      <header className="px-7 pt-6 pb-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)] print:bg-white print:pt-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Metadata row */}
        {generatedAt && (
          <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-3 tabular-nums">
            Generated {formatDate(generatedAt)}
          </p>
        )}
      </header>

      {/* ── B. Body zone ────────────────────────────────────────────────── */}
      <div
        className={cn(
          "relative",
          collapsible && !expanded && "max-h-[420px] overflow-hidden"
        )}
      >
        {/* Reading column — constrained width for comfortable measure */}
        <div
          className={cn(
            "px-8 py-7 mx-auto max-w-[760px]",
            "print:px-0 print:py-4 print:max-w-full"
          )}
        >
          <DocumentBodyMarkdown markdown={body} variant={variant} />
        </div>

        {/* Fade-out scrim when collapsed */}
        {collapsible && !expanded && (
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[var(--color-surface)] to-transparent pointer-events-none print:hidden" />
        )}
      </div>

      {/* Show more / less toggle */}
      {collapsible && (
        <div className="flex justify-center py-3 border-t border-[var(--color-border)] print:hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-medium hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Show full document
              </>
            )}
          </button>
        </div>
      )}

      {/* ── C. Footer action zone ───────────────────────────────────────── */}
      <footer className="px-7 py-3 border-t border-[var(--color-border)] bg-[var(--color-readonly-bg)] flex items-center gap-4 print:hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
        {actions && <div className="ml-auto">{actions}</div>}
      </footer>
    </article>
  );
}
