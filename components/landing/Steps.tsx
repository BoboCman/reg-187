import { ClipboardList, FileSearch, FileCheck2 } from "lucide-react";

const STEPS = [
  {
    icon: FileSearch,
    title: "Upload the illustration",
    body: "The PDF is read in your browser. The names you enter are removed before any text is sent, and each policy fact is matched to the page it came from, so you can check it against the carrier's document.",
  },
  {
    icon: ClipboardList,
    title: "Add the client's objective",
    body: "Six short questions about purpose, amount, horizon, funding, priorities and existing coverage, with a follow-up only when it applies. Nothing from the carrier's illustration is retyped.",
  },
  {
    icon: FileCheck2,
    title: "Review and share the companion",
    body: "Check the evidence, edit the wording and approve. Every edit is re-checked. Client export opens only after your approval and your firm's recorded approval of client use.",
  },
];

export function Steps() {
  return (
    <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How it works</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">{i + 1}</span>
                  <s.icon className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
