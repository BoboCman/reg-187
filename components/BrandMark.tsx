import Link from "next/link";
import { cn } from "@/lib/utils";

/** The PolicyPlan mark, shared by the landing page and the app header. */
export function BrandMark({ href = "/", size = "md", className }: { href?: string; size?: "sm" | "md"; className?: string }) {
  const box = size === "sm" ? "w-7 h-7 p-[6px] gap-[2.5px] rounded-md" : "w-9 h-9 p-[7px] gap-[3px] rounded-lg";
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 no-underline shrink-0", className)}>
      <span className={cn("bg-[var(--color-accent)] grid grid-cols-2 items-center justify-items-center", box)} aria-hidden>
        <span className="w-full h-full bg-white rounded-[2px]" />
        <span className="w-full h-full bg-white/65 rounded-[2px]" />
        <span className="w-full h-full bg-white/50 rounded-[2px]" />
        <span className="w-full h-full bg-white/40 rounded-[2px]" />
      </span>
      <span className={cn("text-[var(--color-text-primary)]", size === "sm" ? "text-base" : "text-xl")}>
        <span className="font-light tracking-wide">Policy</span>
        <span className="font-bold">Plan</span>
      </span>
    </Link>
  );
}
