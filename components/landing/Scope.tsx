export const SCOPE_TEXT =
  "PolicyPlan is an advisor-support and communication tool. It does not recommend or approve insurance products, replace carrier illustrations or required forms, or determine whether a transaction satisfies any law or firm rule. Client-facing use is subject to applicable firm, carrier and regulatory requirements.";

export function Scope() {
  return (
    <section className="bg-white py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">{SCOPE_TEXT}</p>
      </div>
    </section>
  );
}
