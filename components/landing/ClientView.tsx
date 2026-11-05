import Link from "next/link";
import { ArrowRight } from "lucide-react";

const POINTS = [
  ["The proposal at a glance", "Death benefit, planned outlay and payment period, each with the page it comes from."],
  ["Why it is being considered", "The purpose the client described, in the client's own terms, and what the design is built around."],
  ["Guaranteed versus illustrated", "What the contract guarantees, and under which conditions, kept apart from values that depend on assumptions."],
  ["Payment conditions", "What has to keep happening, such as funding as illustrated, for the values shown to hold."],
  ["What to discuss", "Up to three points chosen for this client and this design, written neutrally."],
];

export function ClientView() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What the client can understand quickly</h2>
            <p className="mb-8 text-lg text-slate-600">One page, in plain language, given alongside the carrier illustration.</p>
            <ul className="space-y-5">
              {POINTS.map(([t, b]) => (
                <li key={t} className="border-l-2 border-blue-700 pl-4">
                  <p className="font-semibold text-slate-900">{t}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{b}</p>
                </li>
              ))}
            </ul>
            <Link href="/sample-companion" className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800">
              Open the sample companions <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Link href="/sample-companion" className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-lg transition-shadow hover:shadow-xl" aria-label="Open the sample companion">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/samples/indexed-ul.png" alt="Sample Illustration Companion for a fictional indexed universal life proposal" className="w-full" width={1275} height={1650} loading="lazy" />
          </Link>
        </div>
      </div>
    </section>
  );
}
