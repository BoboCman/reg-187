/** Client-safe story catalog and labels (no server imports). */

/* ── Catalog ──────────────────────────────────────────────────────────── */

export type CatalogEntry = {
  key: string;
  name: string;
  tagline: string;
  designs: string;
  available: boolean;
  product_classes: string[];
};

/** Shown on the story picker. Only `available` stories can be started. */
export const STORY_CATALOG: CatalogEntry[] = [
  {
    key: "apartment",
    name: "The Apartment Complex",
    tagline: "Build it, lease it up, let it work for you. Early years carry the construction cost, then value builds and the building can provide income and a legacy.",
    designs: "Indexed universal life, accumulation and income designs",
    available: true,
    product_classes: ["IUL", "UL", "VUL"],
  },
  {
    key: "locking_the_price",
    name: "Locking In the Price",
    tagline: "Like buying land at today's price: the value is the guarantee, as long as each premium is paid on time.",
    designs: "Guaranteed UL and no-lapse guarantee designs",
    available: false,
    product_classes: ["GUL", "UL"],
  },
  {
    key: "orchard",
    name: "The Orchard",
    tagline: "Planting, growing, harvest: guaranteed growth, with dividends as the harvest that is not guaranteed.",
    designs: "Whole life",
    available: false,
    product_classes: ["WL"],
  },
];


export const GOAL_LABELS: Record<"retirement_income" | "legacy" | "long_term_care" | "accumulation" | "business" | "protection", string> = {
  retirement_income: "Retirement income",
  legacy: "Legacy",
  long_term_care: "Long-term care",
  accumulation: "Wealth accumulation",
  business: "Business planning",
  protection: "Protection",
};
