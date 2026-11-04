/**
 * Public sample letter for the landing page ("See a sample letter").
 * Fictional client, advisor, firm, carrier and product. The figures are
 * invented but internally consistent, so the at-a-glance table reads true.
 */
import type { Letter } from "@/lib/policyplan/letter";
import type { LetterBranding } from "@/lib/policyplan/letter-html";

export const SAMPLE_BRANDING: LetterBranding = {
  advisor_name: "Jordan Ellis",
  advisor_credentials: "CLU, ChFC",
  advisor_title: "Senior Wealth Advisor",
  firm_name: "Example Financial Group",
  firm_address: "100 Main Street, Suite 400, Anytown, NY 10000",
  phone: "(555) 010-0100",
  email: "jordan.ellis@example.com",
  license_number: "NY LA-0000000",
  brand_primary_color: "#1a3a6b",
  brand_secondary_color: "#5b6b82",
  disclosures:
    "Sample letter for demonstration only. Example Financial Group, Example Life Insurance Company and all people named are fictional. Insurance products are offered through licensed agents. Guarantees are subject to the claims-paying ability of the issuing insurer.",
};

export const SAMPLE_LETTER: Letter = {
  contract_version: "1.1",
  salutation: "Dear Eleanor and Thomas,",
  opening:
    "Thank you for the time we spent reviewing your estate plan. This letter explains the policy I recommend for your family trust, why it fits what you told me, and what you should weigh before you apply.",
  sections: [
    {
      id: "why_we_met",
      title: "What you told me matters most",
      paragraphs: [
        "Your first priority is making sure your estate has cash to pay estate taxes when the second of you dies, so your children are not forced to sell the family real estate. You also want the policy to pass wealth to your children equally, and you would like it held outside your taxable estate in your irrevocable trust.",
        "You told me you strongly prefer guarantees, you would rather avoid relying on values that are not guaranteed, and you do not want to be asked for more premium later. Those answers shaped this recommendation more than anything else.",
      ],
      bullets: [],
      quotes: [],
    },
    {
      id: "recommendation",
      title: "What I recommend",
      paragraphs: [
        "I recommend Example Guaranteed Survivorship UL from Example Life Insurance Company, owned by the Whitfield Family Irrevocable Trust. It pays a $6,000,000 death benefit when the second of you dies.",
        "The planned premium is $61,500 a year, paid by the trust from your annual exclusion gifts, for 32 years, through Eleanor's age 99. If every premium is paid, the total is $1,968,000.",
      ],
      bullets: [],
      quotes: [],
    },
    {
      id: "how_it_works",
      title: "How the policy works",
      paragraphs: [
        "This is a survivorship universal life policy built around a guarantee, not around cash value growth. The guarantee keeps the full $6,000,000 death benefit in force to Eleanor's age 121, as long as each planned premium is paid on time.",
        "Cash value is a secondary feature here. It is small in the early years because of surrender charges, which start at $148,200 in year 1 and reach zero after year 15. The table below shows the guaranteed and illustrated values at key years.",
      ],
      bullets: [
        "Estate Preservation Rider: adds temporary coverage in the first four years, which can help with estate taxes on gifts made within three years of the second death. Please confirm this need with your estate attorney.",
        "Policy Split Option: lets the trust split the policy into two single-life policies if the estate tax law or your marriage changes.",
      ],
      quotes: [
        {
          text: "The guaranteed death benefit will remain in force to the younger insured's age 121 provided the planned premium is paid when due.",
          source: "Illustration, p. 6",
        },
      ],
    },
    {
      id: "why_it_fits",
      title: "Why it fits you",
      paragraphs: [
        "Estate liquidity: the death benefit is paid when the second of you dies, which is when the estate tax is due. Ownership by the trust is intended to keep the proceeds outside your taxable estate; please confirm the trust terms with your estate attorney.",
        "Your preference for guarantees: the death benefit is guaranteed to age 121 without depending on interest credits, so you are not relying on illustrated results to keep coverage in force.",
        "Equal treatment of your children: the trust can divide the proceeds equally, and the Policy Split Option gives you flexibility if your plan changes.",
      ],
      bullets: [],
      quotes: [],
    },
    {
      id: "what_to_weigh",
      title: "What to weigh before you decide",
      paragraphs: [
        "The guarantee depends on paying every premium on time. You told me you would not want to pay more later. If a premium is late or skipped, the guarantee can shorten, and restoring it may require a larger payment. Setting up the trust's gifts on a fixed annual schedule is the simplest protection.",
        "This policy is designed for the death benefit, not for access to cash. The surrender value stays well below the premiums paid for most of the policy's life, and surrender charges apply for 15 years. Money paid into this policy should be money you will not need back.",
        "The commitment is long. The total scheduled premium is $1,968,000 for a $6,000,000 death benefit. The annual premium is about 15% of your reported income and about 2% of your liquid net worth. That fits your finances today, but it assumes the gifting plan continues for 32 years.",
      ],
      bullets: [],
      quotes: [
        {
          text: "Paying less than the planned premium, or paying it late, may shorten the period during which the death benefit is guaranteed.",
          source: "Illustration, p. 7",
        },
      ],
    },
    {
      id: "guaranteed_vs_illustrated",
      title: "What is guaranteed and what is not",
      paragraphs: [
        "Guaranteed: the $6,000,000 death benefit to Eleanor's age 121 when premiums are paid as planned, and the guaranteed surrender values in the table, which assume the highest charges the contract allows and the minimum interest rate.",
        "Not guaranteed: the illustrated surrender values, which assume the current interest rate of 4.5% and current charges continue unchanged. If the company lowers its rate or raises its charges, the illustrated values will be lower. The death benefit guarantee does not change if that happens.",
      ],
      bullets: [],
      quotes: [],
    },
    {
      id: "next_steps",
      title: "Next steps",
      paragraphs: [
        "Please read the full illustration, including the guaranteed pages, and share this letter with your estate attorney. If you decide to proceed, the trustee signs the application, and you will each complete underwriting. When the policy is delivered, you will have a free-look period to review it and cancel for a refund.",
      ],
      bullets: [],
      quotes: [],
    },
  ],
  closing: "Please call me with any questions. I want you both to be comfortable with this decision before you apply.",
  policy_snapshot: {
    carrier: "Example Life Insurance Company",
    product: "Example Guaranteed Survivorship UL",
    product_type: "Survivorship UL",
    face_amount: 6000000,
    annual_premium: 61500,
    premium_years: "32",
    insured_age: 68,
    risk_class: "Preferred Non-Nicotine",
    illustrated_rate: "4.5",
    illustration_date: "2026-10-15",
    facts: [
      { label: "Death benefit option", value: "Level" },
      { label: "Guarantee", value: "Death benefit guaranteed to the younger insured's age 121, if planned premiums are paid on time" },
      { label: "Surrender charge", value: "$148,200 in year 1, none after year 15" },
      { label: "Total scheduled premium", value: "$1,968,000 through age 99" },
      { label: "Riders included", value: "Estate Preservation Rider; Policy Split Option" },
      { label: "Owner", value: "Whitfield Family Irrevocable Trust" },
      { label: "Tax status", value: "Not a modified endowment contract (MEC)" },
    ],
    milestones: [
      { year: 1, age: 68, cumulative_premium: 61500, sv_guaranteed: 0, db_guaranteed: 6000000, sv_illustrated: 0, db_illustrated: 6000000 },
      { year: 5, age: 72, cumulative_premium: 307500, sv_guaranteed: 98000, db_guaranteed: 6000000, sv_illustrated: 152000, db_illustrated: 6000000 },
      { year: 10, age: 77, cumulative_premium: 615000, sv_guaranteed: 210400, db_guaranteed: 6000000, sv_illustrated: 388900, db_illustrated: 6000000 },
      { year: 15, age: 82, cumulative_premium: 922500, sv_guaranteed: 236000, db_guaranteed: 6000000, sv_illustrated: 612300, db_illustrated: 6000000 },
      { year: 20, age: 87, cumulative_premium: 1230000, sv_guaranteed: 148700, db_guaranteed: 6000000, sv_illustrated: 790500, db_illustrated: 6000000 },
      { year: 25, age: 92, cumulative_premium: 1537500, sv_guaranteed: 0, db_guaranteed: 6000000, sv_illustrated: 864200, db_illustrated: 6000000 },
      { year: 32, age: 99, cumulative_premium: 1968000, sv_guaranteed: 0, db_guaranteed: 6000000, sv_illustrated: 702000, db_illustrated: 6000000 },
    ],
  },
  tensions: [],
};
