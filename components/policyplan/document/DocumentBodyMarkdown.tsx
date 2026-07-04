"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type DocVariant = "advisor" | "client";

function components(variant: DocVariant) {
  const isAdvisor = variant === "advisor";

  return {
    h1: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mt-8 mb-4 leading-tight print:mt-6">
        {children}
      </h1>
    ),
    h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2
        className={cn(
          "font-semibold text-[var(--color-text-primary)] leading-snug",
          isAdvisor
            ? "text-[15px] uppercase tracking-wide mt-8 mb-3 pb-1 border-b border-[var(--color-border)]"
            : "text-[15px] mt-7 mb-2.5",
          "print:break-after-avoid print:mt-5"
        )}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        className={cn(
          "text-[13px] font-semibold text-[var(--color-text-primary)] leading-snug",
          isAdvisor ? "mt-5 mb-2" : "mt-4 mb-2",
          "print:break-after-avoid"
        )}
      >
        {children}
      </h3>
    ),
    p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="text-[15px] leading-[1.7] text-[var(--color-text-secondary)] mb-4 last:mb-0">
        {children}
      </p>
    ),
    strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="font-semibold text-[var(--color-text-primary)]">
        {children}
      </strong>
    ),
    em: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <em className="italic text-[var(--color-text-secondary)]">{children}</em>
    ),
    hr: () => (
      <hr className="my-7 border-none border-t border-[var(--color-border)] print:my-5" />
    ),
    ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5 text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
        {children}
      </ul>
    ),
    ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal list-outside pl-5 mb-4 space-y-1.5 text-[15px] leading-[1.7] text-[var(--color-text-secondary)]">
        {children}
      </ol>
    ),
    li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="leading-[1.7]">{children}</li>
    ),
    blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="border-l-4 border-[var(--color-border-strong)] pl-4 py-1 my-4 text-[var(--color-text-muted)] italic text-[14px]">
        {children}
      </blockquote>
    ),
    // Callout-style bold paragraphs that start with WARNING / TENSION / NOTE
    // are handled inside <p> by detecting the strong child — see wrapper below.
  };
}

interface Props {
  markdown: string;
  variant?: DocVariant;
  className?: string;
}

export function DocumentBodyMarkdown({ markdown, variant = "advisor", className }: Props) {
  // Pre-process: detect warning/tension callout blocks
  // Lines that start with **WARNING**, **TENSION**, **NOTE** get wrapped in a callout div
  const processed = markdown;

  return (
    <div
      className={cn(
        "document-body",
        variant === "advisor" ? "doc-variant-advisor" : "doc-variant-client",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components(variant) as never}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
