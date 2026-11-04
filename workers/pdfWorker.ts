/**
 * PDF Processing Web Worker - PRODUCTION v6.4.0
 *
 * Privacy Scrubber for Life Insurance Illustrations
 * USER-INPUT-FIRST ARCHITECTURE
 *
 * Key Changes in v6.4.0:
 *   - CRITICAL: Completely removed Layer 2 (label-based fallback / Strategy A)
 *     The label-based name detection was fundamentally incompatible with insurance
 *     illustrations — it misidentified product names, account names, carrier entities,
 *     and agreement names as PII, causing 100+ false-positive redactions per document.
 *     v6.3.0 disabled it via config flag; v6.4.0 removes all dead code entirely:
 *       • Removed scrubLabelBasedNames() function
 *       • Removed NAME_LABELS array (~110 entries)
 *       • Removed STRATEGY_A_MIN_TOKENS config
 *       • Removed ENABLE_STRATEGY_A_FALLBACK config flag
 *       • Removed Layer 2 invocation from main pipeline
 *       • Removed label_based_fallback from PII risk score weights
 *     User-provided names (Layer 1) are the sole name redaction mechanism.
 *
 * Previous Changes (v6.2.0):
 *   - Variant application checks against protected terms before replacing
 *   - Single-name variants require 6+ chars AND must not be common/insurance words
 *   - Added PROTECTED_PRODUCT_NAMES set for insurance product name preservation
 *   - Removed dangerous bidirectional substring matching from isProtectedTerm()
 *   - Address pattern validates against real US state abbreviations
 *   - SSN unlabeled pattern tightened with separator requirement
 *   - buildFlexiblePattern uses proper word boundaries on both sides
 *   - Redaction audit trail with context capture
 *
 * Redaction Layers:
 *   Layer 1 (PRIMARY):   User-provided names + variant generation (with protected-term guard)
 *   Layer 2 (REMOVED):   Was label-based fallback — removed v6.4.0
 *   Layer 3 (UNCHANGED): Structured PII (SSN, phone, email, DOB, address)
 *
 * @version 6.4.0 (Production)
 */

import * as pdfjs from "pdfjs-dist"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Processing limits
  MAX_REDACTIONS: 5000,
  CONTEXT_WINDOW: 100,

  // Name validation
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 60,
  MIN_NAME_TOKENS: 1, // For Layer 1 (user-provided) - allows single names like "Madonna"
  MAX_NAME_TOKENS: 4,

  // v6.2.0: Single-name variant generation threshold
  // Standalone first/last name variants only generated if name is this long
  SINGLE_NAME_MIN_LENGTH: 6,

  // Feature flags
  // v6.4.1: Debug logging must default to OFF in production. Enabling this logs
  // full user-supplied names, per-match text samples, and rejection diagnostics
  // to the browser console, which defeats the purpose of client-side redaction.
  ENABLE_DEBUG_LOGGING: false,

  // Strategy toggles
  ENABLE_USER_PROVIDED_NAMES: true, // PRIMARY - always on
  ENABLE_STRATEGY_B_GENDER_AGE: false, // DISABLED
  ENABLE_STRATEGY_E_AGENT_COMPANY: false, // DISABLED
  ENABLE_STRATEGY_F_SIGNATURE: false, // DISABLED
  ENABLE_STRATEGY_G_CONTEXTUAL_FOR: false, // DISABLED

  // Variant generation options
  ENABLE_VARIANT_GENERATION: true,
  ENABLE_POSSESSIVE_HANDLING: true,
  ENABLE_WHITESPACE_FLEXIBLE: true,

  // v6.2.0: Guard variant application against protected terms
  ENABLE_VARIANT_PROTECTION_CHECK: true,

  // Structured PII options
  ENABLE_PHONE_NORMALIZATION: true,
  ENABLE_ADDRESS_REDACTION: true,
}

// =============================================================================
// PROTECTED TERMS (Unchanged from v6.1.0)
// =============================================================================

const PROTECTED_TERMS = new Set([
  // Insurance carriers
  "nationwide",
  "pacific life",
  "lincoln financial",
  "metlife",
  "prudential",
  "northwestern mutual",
  "massmutual",
  "mass mutual",
  "new york life",
  "guardian life",
  "penn mutual",
  "securian",
  "transamerica",
  "axa",
  "principal financial",
  "aig",
  "allianz",
  "ameritas",
  "mutual of omaha",
  "john hancock",
  "symetra",
  "state farm",
  "allstate",
  "geico",
  "liberty mutual",
  "travelers",
  "hartford",
  "aflac",
  "unum",
  "cigna",
  "anthem",
  "humana",
  "aetna",
  "united healthcare",
  "kaiser",
  "blue cross",
  "blue shield",
  "equitable",
  "brighthouse",
  "athene",
  "global atlantic",
  "f&g",
  "protective",
  "voya",
  "jackson national",
  "lincoln national",
  "life insurance company of the southwest",
  "national life",
  "national life group",
  "north american",
  "foresters",
  "united of omaha",

  // Product types
  "universal life",
  "whole life",
  "term life",
  "variable universal",
  "indexed universal",
  "guaranteed universal",
  "variable life",
  "permanent life",
  "survivorship life",
  "joint life",
  "group life",
  "living life defender",
  "life defender",
  "custom guarantee",
  "protection builder",
  "indexed choice",

  // Insurance terms
  "living benefit",
  "death benefit",
  "cash value",
  "face amount",
  "surrender value",
  "policy loan",
  "cost of insurance",
  "premium",
  "surrender charge",
  "mortality charge",
  "expense charge",
  "accumulated value",
  "net surrender",
  "guideline premium",
  "target premium",
  "minimum premium",
  "specified amount",
  "death benefit option",
  "cash surrender",
  "policy year",
  "attained age",
  "issue age",
  "rate class",
  "risk class",
  "accelerated benefit",
  "terminal illness",
  "chronic illness",
  "critical illness",
  "critical injury",
  "long term care",
  "waiver of premium",
  "overloan protection",
  "no lapse guarantee",
  "death benefit guarantee",

  // Index names
  "s&p 500",
  "dow jones",
  "nasdaq",
  "msci eafe",
  "russell 2000",
  "bloomberg",
  "barclays",
  "credit suisse",
  "ubs",
  "multi-index",

  // Document terms
  "policy date",
  "issue date",
  "effective date",
  "maturity date",
  "illustration date",
  "premium payment",
  "annual premium",
  "monthly premium",
  "lump sum",
  "single premium",
  "level premium",
])

// =============================================================================
// PROTECTED PRODUCT NAMES - v6.2.0 NEW
// =============================================================================
// Insurance product names that must NEVER be redacted.
// These are multi-word product names from major carriers that could collide
// with insured names (e.g., "Grace" in "Accumulation Builder Grace Period").

const PROTECTED_PRODUCT_NAMES = new Set([
  // Nationwide
  "yourchoice accumulator",
  "yourchoice ul",
  "marathon iul",
  "marathon ul",
  "no-lapse guarantee ul",
  "peak performance iul",

  // Pacific Life
  "pacific discovery xelerator",
  "pacific indexed performer",
  "pacific odyssey",
  "pacific premiere",
  "pacific choice",

  // Lincoln Financial
  "lincoln wealthadvantage",
  "lincoln assetedge",
  "lincoln lifechoice",
  "lincoln lifeelements",
  "lincoln moneyguard",
  "lincoln vulone",
  "lincoln alliance",

  // MetLife
  "metlife shield level selector",
  "metlife pca life",

  // Prudential
  "prulife index advantage",
  "prulife custom premier",
  "prulife custom premier ii",
  "prulife founders plus",
  "prudential flex guard",

  // Northwestern Mutual
  "custom whole life",
  "custom compact whole life",
  "northwestern mutual extra comp",

  // MassMutual
  "massmutual whole life legacy",
  "massmutual centerstage",
  "whole life legacy 100",
  "centerstage iul",

  // New York Life
  "custom whole life",
  "whole life flex",

  // Guardian
  "guardian provider choice iul",
  "guardian guardian estate advantage",

  // Penn Mutual
  "penn mutual accumulation builder",
  "accumulation builder iul",
  "diversified accumulation builder",
  "penn mutual diversified",

  // Transamerica
  "transamerica financial foundation iul",
  "financial foundation iul",
  "transamerica trendsetter",
  "trendsetter super",
  "trendsetter lb",

  // John Hancock
  "john hancock protection iul",
  "john hancock accumulation iul",
  "protection iul",
  "accumulation iul",
  "vitality program",

  // Securian
  "securian eclipse advantage iul",
  "eclipse advantage iul",
  "eclipse protector",
  "securian signature",

  // Principal
  "principal ul accumulation",
  "principal ul protector",

  // AIG / Corebridge
  "corebridge discovery select",
  "max accumulator",
  "max accumulator+",
  "max protector",
  "select-a-term",
  "discovery select iul",

  // Allianz
  "allianz life pro+",
  "allianz life pro+ advantage",
  "life pro+ advantage",

  // North American
  "north american builder plus iul",
  "builder plus iul",
  "north american custom choice",

  // National Life / LSW
  "life insurance company of the southwest",
  "living life defender",
  "life defender",
  "flexlife iul",
  "peace of mind",

  // Protective
  "protective indexed choice iul",
  "indexed choice iul",
  "protective custom choice ul",

  // Voya
  "voya indexed universal life",

  // Jackson National
  "jackson elite access",
  "elite access iul",

  // Athene
  "athene agility",
  "athene amplify",

  // Brighthouse
  "brighthouse smartguard iul",
  "smartguard iul",
  "brighthouse shield level",

  // F&G
  "f&g iul",
  "f&g accumulator iul",

  // Symetra
  "symetra accumulator iul",
  "symetra protector iul",

  // Equitable
  "equitable bv select",
  "equitable momentum",

  // Global Atlantic
  "global atlantic lifetime builder",
  "lifetime builder iul",

  // Generic product type names that should be preserved
  "accumulation builder",
  "protection builder",
  "indexed choice",
  "custom guarantee",
  "custom choice",
  "smart guard",
  "shield level",
  "value protector",
  "wealth advantage",
  "asset edge",
  "money guard",
  "life choice",
  "life elements",
  "flex life",
  "flex guard",
  "estate advantage",
])

// =============================================================================
// FORM FIELD LABELS - v6.0.1
// =============================================================================

const FORM_FIELD_TERMS = new Set([
  // Contact/Address fields
  "zip",
  "zipcode",
  "phone",
  "telephone",
  "tel",
  "fax",
  "email",
  "street",
  "address",
  "city",
  "state",
  "county",
  "country",
  "region",
  "area",
  "zone",
  "apt",
  "suite",
  "unit",
  "building",
  "floor",
  "po box",
  "postal",
  "mailing",
  "residence",
  "residential",
  "business",
  "work",
  "home",
  "mobile",
  "cell",
  "cellular",

  // Form metadata fields
  "signature",
  "date",
  "time",
  "code",
  "number",
  "id",
  "identifier",
  "reference",
  "ref",
  "info",
  "information",
  "data",
  "field",
  "entry",
  "input",
  "line",
  "box",
  "blank",
  "space",
  "placeholder",

  // Financial/Tax fields
  "bracket",
  "tax",
  "income",
  "ssn",
  "tin",
  "ein",
  "routing",
  "account",
  "bank",
  "checking",
  "savings",

  // Status/Type fields
  "type",
  "status",
  "category",
  "class",
  "level",
  "tier",
  "grade",
  "rating",
  "rank",
  "score",

  // Demographic fields
  "gender",
  "sex",
  "age",
  "dob",
  "birthdate",
  "birthday",
  "born",
  "height",
  "weight",
  "occupation",
  "employer",
  "employed",
  "employment",
  "job",
  "title",
  "position",
  "role",
  "department",
  "division",

  // Name component fields (these are LABELS, not names)
  "initial",
  "initials",
  "middle",
  "suffix",
  "prefix",
  "salutation",
  "nickname",
  "maiden",
  "aka",
  "alias",

  // Document fields
  "page",
  "section",
  "part",
  "item",
  "question",
  "answer",
  "response",
  "choice",
  "option",
  "selection",
  "checkbox",
  "radio",
  "dropdown",
  "list",
  "menu",
  "button",

  // Relationship fields
  "relationship",
  "relation",
  "spouse",
  "dependent",
  "child",
  "children",
  "parent",
  "guardian",
  "minor",
  "adult",

  // Verification fields
  "verify",
  "confirm",
  "agree",
  "accept",
  "decline",
  "yes",
  "no",
  "true",
  "false",
  "other",
  "none",
  "na",
  "n/a",
  "unknown",
  "pending",
  "complete",
  "incomplete",
  "required",
  "optional",
])

// =============================================================================
// INSURANCE-SPECIFIC TERMS
// =============================================================================

const INSURANCE_TERMS = new Set([
  "illustration",
  "illustrations",
  "policy",
  "policies",
  "insurance",
  "benefit",
  "benefits",
  "premium",
  "premiums",
  "rider",
  "riders",
  "value",
  "values",
  "cash",
  "death",
  "life",
  "living",
  "surrender",
  "loan",
  "loans",
  "charge",
  "charges",
  "rate",
  "rates",
  "index",
  "indexed",
  "universal",
  "whole",
  "term",
  "variable",
  "guaranteed",
  "current",
  "projected",
  "accumulated",
  "accumulation",
  "distribution",
  "withdrawal",
  "payment",
  "payments",
  "amount",
  "amounts",
  "annual",
  "monthly",
  "lump",
  "sum",
  "face",
  "net",
  "gross",
  "total",
  "year",
  "years",
  "age",
  "attained",
  "issue",
  "class",
  "level",
  "option",
  "options",
  "account",
  "accounts",
  "table",
  "tables",
  "summary",
  "page",
  "form",
  "forms",
  "series",
  "version",
  "defender",
  "protection",
  "guarantee",
  "guarantees",
  "crediting",
  "credit",
  "credits",
  "terminal",
  "chronic",
  "critical",
  "illness",
  "injury",
  "accelerated",
  "waiver",
  "lapse",
  "overloan",
  "specified",
  "guideline",
  "target",
  "minimum",
  "maximum",
  "optional",
  "required",
  "cost",
  "costs",
  "fee",
  "fees",
  "expense",
  "expenses",
  "mortality",
  "planned",
  "offers",
  "tomorrow",
  "become",
  "ill",
  "access",
  "portion",
  "male",
  "female",
  "standard",
  "preferred",
  "tobacco",
  "non-tobacco",
  "nontobacco",
  // v6.2.0: Additional insurance terms that collide with names
  "grace",
  "rider",
  "select",
  "choice",
  "elite",
  "premier",
  "builder",
  "protector",
  "shield",
  "guard",
  "flex",
  "edge",
  "advantage",
  "discovery",
  "legacy",
  "founders",
  "marathon",
  "performer",
  "odyssey",
  "premiere",
  "momentum",
  "amplify",
  "agility",
])

// Common words that should never be extracted as names
const COMMON_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "had",
  "her",
  "was",
  "one",
  "our",
  "out",
  "has",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "way",
  "who",
  "did",
  "get",
  "let",
  "put",
  "say",
  "she",
  "too",
  "use",
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "will",
  "your",
  "more",
  "when",
  "than",
  "them",
  "into",
  "only",
  "over",
  "such",
  "make",
  "like",
  "just",
  "also",
  "back",
  "after",
  "most",
  "made",
  "first",
  "last",
  "next",
  "same",
  "each",
  "where",
  "those",
  "being",
  "through",
  "before",
  "between",
  "under",
  "again",
  "there",
  "these",
  "would",
  "could",
  "should",
  "about",
  "which",
  "their",
  "other",
  "then",
  "some",
  "what",
  "take",
  "come",
  "here",
  "need",
  "start",
  "paying",
  "receive",
  "chosen",
  "become",
  "access",
  "portion",
  "shown",
  "above",
  "below",
  "based",
  "subject",
  "change",
  "actual",
  "results",
  "unless",
  "accompanied",
  "complete",
  "valid",
  "without",
  "pages",
  "refer",
  "details",
  "event",
  "conflict",
  "control",
  "intended",
  "advice",
  "concerning",
  "situation",
  "consult",
  "appropriate",
  "professional",
  "advisor",
  "trade",
  "name",
  "representing",
  "various",
  "affiliates",
  "offer",
  "variety",
  "financial",
  "service",
  "products",
  "centralized",
  "mailing",
  "address",
  "home",
  "office",
  "independent",
  "agency",
  "bank",
  "credit",
  "union",
  "deposit",
  "insured",
  "rights",
  "reserved",
])

// =============================================================================
// US STATE ABBREVIATIONS - v6.2.0 NEW
// =============================================================================
// Used to validate City, ST ZIP patterns and prevent false positives

const US_STATE_ABBREVIATIONS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP",
])
// =============================================================================
// VALIDATION FUNCTIONS (v6.2.0 - Fixed isProtectedTerm)
// =============================================================================

/**
 * v6.2.0: Simplified - exact match only, no dangerous substring matching.
 * The old bidirectional substring logic caused both false blocks and false passes.
 */
function isProtectedTerm(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (PROTECTED_TERMS.has(normalized)) return true
  // Check multi-word protected terms that the text might fully contain
  // e.g., "Pacific Life Insurance" contains "pacific life"
  for (const term of PROTECTED_TERMS) {
    if (term.includes(" ") && normalized.includes(term)) return true
  }
  return false
}

/**
 * v6.4.1: Fixed to match isProtectedTerm's safer logic - exact match only,
 * plus one-directional substring containment for multi-word product names
 * (e.g. "Pacific Discovery Xelerator IUL" contains "xelerator iul").
 * The previous bidirectional check (productName.includes(normalized)) let
 * any 4+ character substring of a product name - e.g. "Bank" inside
 * "PruLife BankOn" - reject an unrelated real name, and was the exact
 * bidirectional-substring bug isProtectedTerm was hardened against.
 */
function isProtectedProductName(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (PROTECTED_PRODUCT_NAMES.has(normalized)) return true
  // Only check multi-word product names that fully contain the text as a substring
  for (const productName of PROTECTED_PRODUCT_NAMES) {
    if (productName.includes(" ") && normalized.includes(productName)) return true
  }
  return false
}

function isInsuranceTerm(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const words = normalized.split(/\s+/)
  for (const word of words) {
    if (INSURANCE_TERMS.has(word)) return true
  }
  if (INSURANCE_TERMS.has(normalized)) return true
  return false
}

function isFormFieldTerm(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  const words = normalized.split(/\s+/)
  for (const word of words) {
    if (FORM_FIELD_TERMS.has(word)) return true
  }
  if (FORM_FIELD_TERMS.has(normalized)) return true
  const noSpaces = normalized.replace(/\s+/g, "")
  if (FORM_FIELD_TERMS.has(noSpaces)) return true
  return false
}

function isCommonWord(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/)
  return words.every((word) => COMMON_WORDS.has(word))
}

function isLikelyCompanyName(name: string): boolean {
  const companyIndicators = [
    /\b(LLC|Inc|Corp|Ltd|Company|Group|Agency|Financial|Insurance|Mutual)\b/i,
    /\b(Services|Advisors|Partners|Associates|Consultants)\b/i,
    /\b(Bank|Trust|Credit|Union|Securities)\b/i,
  ]
  return companyIndicators.some((pattern) => pattern.test(name))
}

function hasValidNameStructure(text: string, minTokens: number = CONFIG.MIN_NAME_TOKENS): boolean {
  const tokens = text.trim().split(/\s+/)
  if (tokens.length < minTokens || tokens.length > CONFIG.MAX_NAME_TOKENS) {
    return false
  }
  for (const token of tokens) {
    if (!/^[A-Z]/.test(token) && !/^[A-Z]+$/.test(token)) {
      return false
    }
  }
  return true
}

/**
 * Core name validation - used by Layer 1 (user-provided names)
 */
function isValidNameCandidate(name: string, minTokens: number = CONFIG.MIN_NAME_TOKENS): boolean {
  if (!name) return false
  const trimmed = name.trim()
  if (trimmed.length < CONFIG.MIN_NAME_LENGTH || trimmed.length > CONFIG.MAX_NAME_LENGTH) {
    return false
  }
  if (!/[aeiouAEIOU]/i.test(trimmed)) return false
  if (!/[a-zA-Z]/.test(trimmed)) return false
  if (/^(The|This|That|These|Those|If|When|Where|How|What|Why)\b/i.test(trimmed)) {
    return false
  }
  if (isFormFieldTerm(trimmed)) return false
  if (isProtectedTerm(trimmed)) return false
  if (isInsuranceTerm(trimmed)) return false
  if (isProtectedProductName(trimmed)) return false // v6.2.0
  if (isLikelyCompanyName(trimmed)) return false
  if (isCommonWord(trimmed)) return false
  if (!hasValidNameStructure(trimmed, minTokens)) return false
  return true
}

/**
 * v6.2.0: Check if a single-word variant is safe to use as a standalone redaction pattern.
 * This is a STRICTER check than isValidNameCandidate because standalone single words
 * have a much higher false-positive risk.
 */
function isSafeSingleNameVariant(word: string): boolean {
  const lower = word.toLowerCase().trim()

  // Must meet minimum length
  if (lower.length < CONFIG.SINGLE_NAME_MIN_LENGTH) return false

  // Must not be a common English word
  if (COMMON_WORDS.has(lower)) return false

  // Must not be an insurance term
  if (INSURANCE_TERMS.has(lower)) return false

  // Must not be a form field term
  if (FORM_FIELD_TERMS.has(lower)) return false

  // Must not be part of a protected term or product name
  if (isProtectedTerm(word)) return false
  if (isProtectedProductName(word)) return false

  // Must not match common insurance document words that aren't in our sets
  const additionalBlockedWords = new Set([
    "grace", "grant", "hope", "chase", "young", "west", "christian", "victor",
    "barton", "hunter", "mason", "carter", "cooper", "parker", "porter",
    "archer", "turner", "walker", "fisher", "baker", "miller", "taylor",
    "clark", "lewis", "allen", "scott", "green", "adams", "nelson",
    "wright", "mitchell", "campbell", "roberts", "martin", "thomas",
    "jackson", "white", "harris", "wilson", "moore", "brown", "davis",
    "jones", "smith", "rider", "select", "prime", "ultra", "super",
    "power", "smart", "bright", "clear", "secure", "trust", "honor",
    "merit", "excel", "summit", "pinnacle", "horizon", "beacon",
    "compass", "bridge", "harbor", "shelter", "haven", "liberty",
    "heritage", "legacy", "premier", "signature", "platinum", "diamond",
    "golden", "silver", "bronze", "eagle", "falcon", "phoenix",
  ])
  if (additionalBlockedWords.has(lower)) return false

  return true
}

// =============================================================================
// NAME VARIANT GENERATION (v6.2.0 - Protected single-name variants)
// =============================================================================

/**
 * Generates all reasonable variants of a name for comprehensive scrubbing.
 * v6.2.0: Single-word variants now require stricter validation via isSafeSingleNameVariant().
 */
function generateNameVariants(name: string): Set<string> {
  const variants = new Set<string>()
  const trimmed = name.trim()

  if (!trimmed || trimmed.length < 2) return variants

  // Original as entered
  variants.add(trimmed)

  // Case variants
  variants.add(trimmed.toUpperCase())
  variants.add(trimmed.toLowerCase())

  // Title case
  const titleCase = trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
  variants.add(titleCase)

  const tokens = trimmed.split(/\s+/)

  if (tokens.length >= 2) {
    const firstName = tokens[0]
    const lastName = tokens[tokens.length - 1]
    const middleNames = tokens.slice(1, -1)

    // "Last, First" formats
    variants.add(`${lastName}, ${firstName}`)
    variants.add(`${lastName},${firstName}`)
    variants.add(`${lastName.toUpperCase()}, ${firstName.toUpperCase()}`)
    variants.add(`${lastName.toLowerCase()}, ${firstName.toLowerCase()}`)

    // Title case "Last, First"
    const firstNameTitle = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    const lastNameTitle = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()
    variants.add(`${lastNameTitle}, ${firstNameTitle}`)

    // With middle names: "Last, First Middle"
    if (middleNames.length > 0) {
      const middleStr = middleNames.join(" ")
      variants.add(`${lastName}, ${firstName} ${middleStr}`)
      variants.add(`${lastNameTitle}, ${firstNameTitle} ${middleStr}`)
    }

    // Initial formats
    variants.add(`${firstName.charAt(0)}. ${lastName}`)
    variants.add(`${firstName.charAt(0)} ${lastName}`)
    variants.add(`${firstName.charAt(0)}.${lastName}`)
    variants.add(`${firstName.charAt(0).toUpperCase()}. ${lastName}`)
    variants.add(`${firstName.charAt(0).toUpperCase()}. ${lastNameTitle}`)
    variants.add(`${firstName.charAt(0).toUpperCase()}. ${lastName.toUpperCase()}`)

    // v6.2.0: Single first/last name variants - ONLY if they pass strict safety check
    if (isSafeSingleNameVariant(firstName)) {
      variants.add(firstName)
      variants.add(firstName.toUpperCase())
      variants.add(firstName.toLowerCase())
      variants.add(firstNameTitle)
    }

    if (isSafeSingleNameVariant(lastName)) {
      variants.add(lastName)
      variants.add(lastName.toUpperCase())
      variants.add(lastName.toLowerCase())
      variants.add(lastNameTitle)
    }
  }

  // Possessive forms - both ASCII and curly apostrophe
  if (CONFIG.ENABLE_POSSESSIVE_HANDLING) {
    const baseVariants = Array.from(variants)
    for (const v of baseVariants) {
      variants.add(`${v}'s`)
      variants.add(`${v}\u2019s`)
    }
  }

  return variants
}

// =============================================================================
// WHITESPACE-FLEXIBLE PATTERN BUILDER (v6.2.0 - Fixed both-side boundaries)
// =============================================================================

/**
 * v6.2.0: Now uses proper word boundaries on BOTH sides of the pattern.
 * The old version had \b on the left but a loose lookahead on the right,
 * which could match partial words at end of compounds.
 */
function buildFlexiblePattern(text: string): RegExp {
  let escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (CONFIG.ENABLE_WHITESPACE_FLEXIBLE) {
    escaped = escaped.replace(/\s+/g, "[\\s]+")
  }
  // v6.2.0: Use \b on both sides for proper word boundary matching
  return new RegExp(`\\b${escaped}\\b`, "gi")
}

// =============================================================================
// LAYER 1: USER-PROVIDED NAME SCRUBBING (v6.2.0 - Protected variant guard)
// =============================================================================

/**
 * Scrubs all user-provided names from the document.
 * v6.2.0: Each variant is checked against protected terms before application.
 * v6.4.1: Now returns a `warnings` array. isValidNameCandidate() rejects a
 * supplied name entirely if ANY single token collides with a protected/
 * insurance/common-word list, which means zero redaction happens anywhere
 * in the document for that person - previously this was only visible behind
 * ENABLE_DEBUG_LOGGING. Callers must now surface these warnings to the user
 * so a silently-unredacted name doesn't go unnoticed.
 */
function scrubUserProvidedNames(
  text: string,
  namesToRedact: string[],
): { text: string; log: any[]; warnings: any[] } {
  if (!CONFIG.ENABLE_USER_PROVIDED_NAMES || !namesToRedact || namesToRedact.length === 0) {
    return { text, log: [], warnings: [] }
  }

  let result = text
  let totalReplacements = 0
  const namesProcessed: string[] = []
  const nameMatchCounts: Record<string, number> = {}
  const skippedVariants: Array<{ variant: string; reason: string }> = []
  const auditTrail: Array<{ variant: string; count: number; sample: string }> = []

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`\n=== v6.4.0 Layer 1: User-Provided Names ===`)
    console.log(`Names to redact: ${namesToRedact.length}`)
    namesToRedact.forEach((name) => console.log(`  - "${name}"`))
  }

  let acceptedCount = 0
  let rejectedCount = 0
  const rejectedNames: string[] = []
  const warnings: any[] = []

  // Generate variants for all provided names
  const allVariants = new Set<string>()
  const variantToOriginalName = new Map<string, string>()

  for (const name of namesToRedact) {
    if (name && name.trim().length >= 2) {
      const isValid = isValidNameCandidate(name, CONFIG.MIN_NAME_TOKENS)

      if (CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`[DIAGNOSTIC]   "${name}" -> isValidNameCandidate: ${isValid}`)
      }

      if (isValid) {
        const trimmedName = name.trim()
        const variants = generateNameVariants(trimmedName)
        variants.forEach((v) => {
          allVariants.add(v)
          variantToOriginalName.set(v, trimmedName)
        })
        namesProcessed.push(trimmedName)
        nameMatchCounts[trimmedName] = 0
        acceptedCount++
      } else {
        rejectedCount++
        rejectedNames.push(name)
        warnings.push({
          type: "name_not_redacted",
          name,
          reason:
            "This name was not redacted anywhere in the document because it matched a protected term, insurance term, or common word.",
          confidence: "high",
        })
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          const trimmed = name.trim()
          console.log(`[DIAGNOSTIC]     REJECTED "${name}":`)
          console.log(`[DIAGNOSTIC]       - Length check: ${trimmed.length < CONFIG.MIN_NAME_LENGTH || trimmed.length > CONFIG.MAX_NAME_LENGTH}`)
          console.log(`[DIAGNOSTIC]       - No vowels: ${!/[aeiouAEIOU]/i.test(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isFormFieldTerm: ${isFormFieldTerm(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isProtectedTerm: ${isProtectedTerm(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isInsuranceTerm: ${isInsuranceTerm(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isProtectedProductName: ${isProtectedProductName(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isLikelyCompanyName: ${isLikelyCompanyName(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - isCommonWord: ${isCommonWord(trimmed)}`)
          console.log(`[DIAGNOSTIC]       - hasValidNameStructure: ${hasValidNameStructure(trimmed, CONFIG.MIN_NAME_TOKENS)}`)
        }
      }
    }
  }

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`[DIAGNOSTIC] Accepted: ${acceptedCount}/${namesToRedact.length}`)
    console.log(`[DIAGNOSTIC] Rejected: ${rejectedCount}/${namesToRedact.length}`)
    if (rejectedNames.length > 0) {
      console.log(`[DIAGNOSTIC] Rejected names: ${JSON.stringify(rejectedNames)}`)
    }
    console.log(`Generated ${allVariants.size} variants from ${namesProcessed.length} names`)
  }

  // Sort by length (longest first) to avoid partial replacements
  const sortedVariants = Array.from(allVariants).sort((a, b) => b.length - a.length)

  // Scrub all variants - v6.2.0: WITH protected term guard
  for (const variant of sortedVariants) {
    if (variant.length < 2) continue

    // =========================================================================
    // v6.2.0 CRITICAL FIX: Check variant against protected terms before replacing
    // =========================================================================
    if (CONFIG.ENABLE_VARIANT_PROTECTION_CHECK) {
      const variantLower = variant.toLowerCase().trim()

      // Strip possessive suffix for checking
      const baseVariant = variantLower
        .replace(/'s$/i, "")
        .replace(/\u2019s$/i, "")
        .trim()

      // Check 1: Exact match against protected terms
      if (PROTECTED_TERMS.has(baseVariant)) {
        skippedVariants.push({ variant, reason: "protected_term" })
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`  SKIP variant "${variant}" -> matches protected term`)
        }
        continue
      }

      // Check 2: Exact match against protected product names
      if (PROTECTED_PRODUCT_NAMES.has(baseVariant)) {
        skippedVariants.push({ variant, reason: "protected_product_name" })
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`  SKIP variant "${variant}" -> matches protected product name`)
        }
        continue
      }

      // Check 3: Single-word variant that's an insurance term
      if (!baseVariant.includes(" ") && INSURANCE_TERMS.has(baseVariant)) {
        skippedVariants.push({ variant, reason: "insurance_term" })
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`  SKIP variant "${variant}" -> matches insurance term`)
        }
        continue
      }

      // Check 4: Single-word variant that's a common word
      if (!baseVariant.includes(" ") && COMMON_WORDS.has(baseVariant)) {
        skippedVariants.push({ variant, reason: "common_word" })
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`  SKIP variant "${variant}" -> matches common word`)
        }
        continue
      }
    }

    const pattern = buildFlexiblePattern(variant)
    const matches = result.match(pattern)

    if (matches && matches.length > 0) {
      const count = matches.length

      // v6.2.0: Capture audit sample before replacement
      const firstMatchIndex = result.search(pattern)
      if (firstMatchIndex >= 0) {
        const sampleStart = Math.max(0, firstMatchIndex - 20)
        const sampleEnd = Math.min(result.length, firstMatchIndex + variant.length + 20)
        const sample = result.substring(sampleStart, sampleEnd).replace(/\n/g, " ")
        auditTrail.push({ variant, count, sample: `...${sample}...` })
      }

      result = result.replace(pattern, "[REDACTED NAME]")
      totalReplacements += count

      const originalName = variantToOriginalName.get(variant)
      if (originalName && nameMatchCounts[originalName] !== undefined) {
        nameMatchCounts[originalName] += count
      }

      if (CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`  Scrubbed: "${variant}" (${count}x)`)
      }
    }
  }

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`Layer 1 complete: ${totalReplacements} replacements`)
    console.log(`Per-name match counts:`, nameMatchCounts)
    if (skippedVariants.length > 0) {
      console.log(`Skipped ${skippedVariants.length} variants due to protection checks:`)
      skippedVariants.forEach(({ variant, reason }) => {
        console.log(`  "${variant}" -> ${reason}`)
      })
    }
  }

  return {
    text: result,
    log:
      totalReplacements > 0 || Object.keys(nameMatchCounts).length > 0
        ? [
            {
              type: "user_provided_names",
              count: totalReplacements,
              uniqueNames: namesProcessed.length,
              variants: allVariants.size,
              skippedVariants: skippedVariants.length,
              confidence: "very_high",
              description: `Redacted ${namesProcessed.length} user-provided names (${allVariants.size} variants, ${skippedVariants.length} skipped, ${totalReplacements} instances)`,
              nameMatches: nameMatchCounts,
              auditTrail,
            },
          ]
        : [],
    warnings,
  }
}
// =============================================================================
// LAYER 3: STRUCTURED PII (v6.2.0 - Tightened SSN, validated state abbrevs)
// =============================================================================

const PRESERVE_DATE_KEYWORDS = [
  "policy date",
  "issue date",
  "effective date",
  "prepared on",
  "maturity date",
  "as of date",
  "illustration date",
  "in force date",
  "premium due date",
  "application date",
  "payment date",
  "expiry date",
  "renewal date",
  "termination date",
  "surrender date",
  "valuation date",
  "presented on",
  "inforce date",
  "expiration date",
  "lapse date",
  "valid for",
  "valid through",
  "valid until",
  "billing date",
  "due date",
  "anniversary date",
  "policy anniversary",
  "signed date",
  "signature date",
  "policy year",
  "calendar year",
  "end of year",
  "beginning of year",
]

function shouldPreserveDate(text: string, matchIndex: number): boolean {
  const contextStart = Math.max(0, matchIndex - CONFIG.CONTEXT_WINDOW)
  const beforeContext = text.substring(contextStart, matchIndex).toLowerCase()

  // v6.4.1: An explicit DOB label immediately preceding this match must always
  // win over an unrelated preserve-keyword found earlier in the same 100-char
  // window. Previously "Issue Date 05/22/2018 DOB: 01/02/1960" could suppress
  // redaction of the DOB value because "issue date" was inside the window -
  // that is a real PII leak. Find the nearest DOB indicator to the match and
  // only treat it as a DOB if no preserve-keyword sits between it and the date.
  const dobIndicators = [
    "d.o.b",
    "dob",
    "date of birth",
    "birth date",
    "birthdate",
    "birthday",
    "born",
  ]

  let nearestDobIndicatorPos = -1
  for (const indicator of dobIndicators) {
    const pos = beforeContext.lastIndexOf(indicator)
    if (pos > nearestDobIndicatorPos) {
      nearestDobIndicatorPos = pos
    }
  }

  if (nearestDobIndicatorPos !== -1) {
    // Check whether any preserve-keyword appears AFTER the DOB indicator
    // (i.e. closer to the actual date value). If so, that keyword - not the
    // DOB label - governs this date and it should be preserved.
    const textAfterDobIndicator = beforeContext.substring(nearestDobIndicatorPos)
    const preserveKeywordAfterDob = PRESERVE_DATE_KEYWORDS.some((keyword) =>
      textAfterDobIndicator.includes(keyword),
    )
    if (!preserveKeywordAfterDob) {
      return false
    }
  }

  return PRESERVE_DATE_KEYWORDS.some((keyword) => beforeContext.includes(keyword))
}

function normalizePhoneNumbers(text: string): string {
  if (!CONFIG.ENABLE_PHONE_NORMALIZATION) return text
  let result = text
  result = result.replace(/\((\d{3})\)\s*[\r\n]+\s*(\d{3}[-.\s]?\d{4})/g, "($1) $2")
  result = result.replace(/(\d{3})[-.\s]*[\r\n]+\s*(\d{3}[-.\s]?\d{4})/g, "$1-$2")
  return result
}

function removePIIDirectly(text: string): { text: string; log: any[] } {
  let result = text
  const log: any[] = []

  const ssnPatterns = [
    {
      regex: /(?:SSN|Social\s*Security(?:\s*Number)?|SS#|SSN#|Tax\s*ID)[#:;\s]*\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/gi,
      type: "ssn_labeled",
    },
    // v6.2.0: Tightened - require at least one separator to avoid matching policy numbers
    {
      regex: /\b(?!000|666|9\d{2})\d{3}[-.](?!00)\d{2}[-.](?!0000)\d{4}\b/g,
      type: "ssn_pattern",
    },
  ]

  const phonePatterns = [
    {
      regex:
        /(?:Phone\s*(?:Number)?|Tel(?:ephone)?(?:\s*Number)?|Mobile|Cell(?:ular)?|Contact|Fax|Call|ph:|\.Phone|T\.|Agent\s*Phone)[#:;\s]*(?:\+?1[-.\s]?)?[(]?\d{3}[)]?[-.\s]?\d{3}[-.\s]?\d{4}/gi,
      type: "phone_labeled",
    },
    {
      regex: /\b(?:\+?1[-.\s]?)?[(]\d{3}[)][-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      type: "phone_parens",
    },
    {
      regex: /\b(?:\+?1[-.\s]?)?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
      type: "phone_dashed",
    },
  ]

  const emailPatterns = [
    {
      regex: /(?:Email|E-?mail|EMail|Electronic\s*Mail)\s*[#:;\s]+[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi,
      type: "email_labeled",
    },
    {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      type: "email_pattern",
    },
  ]

  const allPatterns = [...ssnPatterns, ...phonePatterns, ...emailPatterns]

  allPatterns.forEach(({ regex, type }) => {
    const matches = result.match(regex)
    if (matches && matches.length > 0) {
      log.push({ type, count: matches.length, confidence: "high" })
      result = result.replace(regex, "[REDACTED]")
    }
  })

  return { text: result, log }
}

function removeDOBWithPreservation(text: string): { text: string; log: any[] } {
  let result = text
  const log: any[] = []
  let dobCount = 0
  let preservedCount = 0

  const dobPatterns = [
    /(?:DOB|Date\s+of\s+Birth|Birth\s*Date|Born\s*(?:on)?|Birthday|D\.O\.B\.?)\s*[:;]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/gi,
    /Age[d]?\s+\d{1,3}(?:\s+years?\s+old)?\s*[,;(]\s*(?:born|DOB|Date of Birth)\s*[:;]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})/gi,
  ]

  dobPatterns.forEach((pattern) => {
    result = result.replace(pattern, (match, group, offset) => {
      if (shouldPreserveDate(result, offset)) {
        preservedCount++
        return match
      }
      dobCount++
      return "[REDACTED DOB]"
    })
  })

  if (dobCount > 0 || preservedCount > 0) {
    log.push({
      type: "dob_with_preservation",
      count: dobCount,
      preserved: preservedCount,
      confidence: "high",
    })
  }

  return { text: result, log }
}

/**
 * v6.2.0: Address patterns now validate state abbreviations
 */
function removeAddresses(text: string): { text: string; log: any[] } {
  if (!CONFIG.ENABLE_ADDRESS_REDACTION) {
    return { text, log: [] }
  }

  let result = text
  let count = 0

  // Patterns 1-4: Street addresses, Spanish streets, PO Box, full state names
  // v6.4.1: Added \b after the suffix alternation. Without it, the suffix list
  // matches as a prefix of the next word - e.g. "961 Index Strategies" matched
  // digits + "Index " + the literal "St" inside "Strategies", corrupting real
  // policy content (a dollar figure) into "[REDACTED ADDRESS]rategies".
  const simplePatterns = [
    /\d{1,5}\s+(?:[A-Za-z]+\.?\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl|Terrace|Ter|Trail|Trl|Parkway|Pkwy|Highway|Hwy)\b\.?(?:\s*[,#]?\s*(?:Apt|Suite|Ste|Unit|#|Bldg|Building|Floor|Fl)\s*[A-Za-z0-9#-]+)?/gi,
    /\d{1,5}\s+(?:Via|Camino|Paseo|Calle|Avenida|Rancho|Plaza|Cerro|Monte|Loma|Vista|Sierra|Tierra|Lago|Rio|Arroyo)\s+(?:de\s+(?:la|los|las)\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s*[,#]?\s*(?:Apt|Suite|Ste|Unit|#)\s*[A-Za-z0-9#-]+)?/gi,
    /P\.?\s*O\.?\s*Box\s+\d+/gi,
    /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*,\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)\s+(\d{5}(?:-\d{4})?)/gi,
  ]

  simplePatterns.forEach((pattern) => {
    const matches = result.match(pattern)
    if (matches) {
      count += matches.length
      result = result.replace(pattern, "[REDACTED ADDRESS]")
    }
  })

  // v6.2.0: City, ST ZIP with validated state abbreviation
  const cityStateZipPattern = /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*,\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)/gi
  result = result.replace(cityStateZipPattern, (match, city, stateAbbr, zip) => {
    // Only redact if the 2-letter code is a real US state abbreviation
    if (US_STATE_ABBREVIATIONS.has(stateAbbr.toUpperCase())) {
      count++
      return "[REDACTED ADDRESS]"
    }
    return match // Not a real state - leave it alone
  })

  return {
    text: result,
    log: count > 0 ? [{ type: "addresses", count, confidence: "medium" }] : [],
  }
}

/**
 * v6.1.0+: Policy number and identifier patterns (unchanged from v6.1.0)
 */
function removeIdentifiers(text: string): { text: string; log: any[] } {
  let result = text
  const log: any[] = []

  const patterns = [
    {
      regex: /(Policy|Contract|Certificate)\s*(?:Number|No\.?|#)\s*[:-]?\s*[A-Z0-9-]{6,20}/gi,
      replacement: "$1 Number: [REDACTED]",
      type: "policy_numbers_labeled",
    },
    {
      regex: /\b(POLICY|Policy)\s+([A-Z]?\d{6,12}[A-Z]?)\b/g,
      replacement: "$1 [REDACTED]",
      type: "policy_numbers_unlabeled",
    },
    {
      regex: /\b(FOR|RE:?|REGARDING)\s+(POLICY|Policy)\s+[A-Z]?\d{6,12}[A-Z]?\b/gi,
      replacement: "$1 $2 [REDACTED]",
      type: "policy_numbers_contextual",
    },
    {
      regex: /(Agent|Producer|Rep(?:resentative)?)\s*(Number|No\.?|#|ID|Code|License(?:\s*Number)?|Lic\.?\s*(?:No\.?|#)?)\s*[:-]?\s*[A-Z0-9-]{4,15}/gi,
      replacement: "$1 $2: [REDACTED]",
      type: "agent_numbers",
    },
    {
      regex: /(?:ILLUSTRATION\s*(?:ID|with\s+ID)|Illustration\s*ID)\s*[-:;]?\s*[A-Za-z0-9-]{6,40}/gi,
      replacement: "Illustration ID: [REDACTED]",
      type: "illustration_ids",
    },
    {
      regex: /(?:Case\s*ID|CaseID|Case\s*No\.?|Case\s*#)\s*[-:;]?\s*[A-Za-z0-9-]{4,20}/gi,
      replacement: "Case ID: [REDACTED]",
      type: "case_ids",
    },
  ]

  patterns.forEach(({ regex, replacement, type }) => {
    const matches = result.match(regex)
    if (matches) {
      result = result.replace(regex, replacement)
      log.push({ type, count: matches.length, confidence: "high" })
    }
  })

  return { text: result, log }
}

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

function cleanupOrphanedRedactions(text: string): { text: string; log: any[] } {
  let result = text
  let count = 0

  const beforeCount = (result.match(/\[REDACTED NAME\]/g) || []).length
  result = result
    .replace(/\[REDACTED NAME\]\s*\[REDACTED NAME\]/g, "[REDACTED NAME]")
    .replace(/\[REDACTED\]\s*\[REDACTED\]/g, "[REDACTED]")
    .replace(/\[REDACTED ADDRESS\]\s*\[REDACTED ADDRESS\]/g, "[REDACTED ADDRESS]")
  const afterCount = (result.match(/\[REDACTED NAME\]/g) || []).length
  count = beforeCount - afterCount

  return {
    text: result,
    log: count > 0 ? [{ type: "orphan_consolidation", count, confidence: "low" }] : [],
  }
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim()
}

// =============================================================================
// MAIN SCRUBBING FUNCTION (v6.2.0)
// =============================================================================

interface ScrubResult {
  scrubbedText: string
  redactionLog: any[]
  warnings: any[]
}

function scrubPIIDocumentLevel(text: string, namesToRedact: string[]): ScrubResult {
  const allLogs: any[] = []
  const warnings: any[] = []

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`\n========================================`)
    console.log(`v6.4.0 Document-Level Processing`)
    console.log(`========================================`)
    console.log(`Document length: ${text.length}`)
    console.log(`User-provided names: ${namesToRedact.length}`)
  }

  let currentText = normalizePhoneNumbers(text)

  // LAYER 1: User-Provided Names (PRIMARY)
  const layer1 = scrubUserProvidedNames(currentText, namesToRedact)
  allLogs.push(...layer1.log)
  warnings.push(...layer1.warnings)
  currentText = layer1.text

  // LAYER 3: Structured PII
  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`\n=== v6.4.0 Layer 3: Structured PII ===`)
  }

  // Pass 1: SSN, Phone, Email
  const pass1 = removePIIDirectly(currentText)
  allLogs.push(...pass1.log)
  currentText = pass1.text

  // Pass 2: Policy/Agent identifiers
  const pass2 = removeIdentifiers(currentText)
  allLogs.push(...pass2.log)
  currentText = pass2.text

  // Pass 3: DOB with date preservation
  const pass3 = removeDOBWithPreservation(currentText)
  allLogs.push(...pass3.log)
  currentText = pass3.text

  // Pass 4: Addresses
  const pass4 = removeAddresses(currentText)
  allLogs.push(...pass4.log)
  currentText = pass4.text

  // CLEANUP
  const cleanup = cleanupOrphanedRedactions(currentText)
  allLogs.push(...cleanup.log)
  currentText = cleanup.text

  const finalText = normalizeWhitespace(currentText)

  if (CONFIG.ENABLE_DEBUG_LOGGING) {
    console.log(`\n========================================`)
    console.log(`v6.4.0 Processing Complete`)
    console.log(`========================================`)
    console.log(`Final text length: ${finalText.length}`)
    console.log(`Reduction: ${((1 - finalText.length / text.length) * 100).toFixed(1)}%`)
    console.log(`Total redaction events: ${allLogs.reduce((sum, log) => sum + (log.count || 0), 0)}`)
  }

  return {
    scrubbedText: finalText,
    redactionLog: allLogs,
    warnings,
  }
}

// =============================================================================
// PII RISK SCORE CALCULATION (v6.4.0 - Layer 2 weight removed)
// =============================================================================

function calculatePIIRiskScore(redactionLog: any[]): number {
  const weights: Record<string, number> = {
    user_provided_names: 10,
    ssn_labeled: 10,
    ssn_pattern: 10,
    phone_labeled: 4,
    phone_parens: 4,
    phone_dashed: 4,
    email_labeled: 6,
    email_pattern: 6,
    dob_with_preservation: 7,
    addresses: 6,
    policy_numbers: 3,
    policy_numbers_labeled: 3,
    policy_numbers_unlabeled: 4,
    policy_numbers_contextual: 3,
    agent_numbers: 2,
    illustration_ids: 3,
    case_ids: 3,
    orphan_consolidation: 1,
  }

  let totalScore = 0
  for (const result of redactionLog) {
    const weight = weights[result.type] || 1
    totalScore += (result.count || 1) * weight
  }

  return Math.min(100, totalScore)
}

// =============================================================================
// PDF TEXT EXTRACTION
// =============================================================================

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

async function extractPageText(page: pdfjs.PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  const items = content.items as TextItem[]

  if (items.length === 0) return ""

  const sortedItems = items
    .filter((item) => item.str.trim().length > 0)
    .sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]
      if (Math.abs(yDiff) > 8) return yDiff
      return a.transform[4] - b.transform[4]
    })

  const rows: TextItem[][] = []
  let currentRow: TextItem[] = []
  let lastY = sortedItems[0]?.transform[5] ?? 0

  for (const item of sortedItems) {
    const currentY = item.transform[5]
    if (Math.abs(lastY - currentY) > 8 && currentRow.length > 0) {
      rows.push(currentRow)
      currentRow = []
    }
    currentRow.push(item)
    lastY = currentY
  }

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows.map((row) => row.map((item) => item.str).join(" ")).join("\n")
}

// =============================================================================
// WORKER INTERFACES
// =============================================================================

export interface WorkerRequest {
  type: "PROCESS_PDF"
  payload: {
    pdfData: ArrayBuffer
    options?: ProcessingOptions
  }
}

/** One redaction-log entry (shape produced by the scrub layers below). */
export interface RedactionResult {
  type: string
  count: number
  pattern?: string
  confidence?: string
  [key: string]: unknown
}

export interface PDFMetadata {
  pageCount?: number
  [key: string]: unknown
}

export interface ProcessingOptions {
  enableRedaction?: boolean
  extractMetadata?: boolean
  namesToRedact?: string[]
}

export interface WorkerResponse {
  type: "PROGRESS" | "COMPLETE" | "ERROR" | "READY"
  payload: {
    progress?: number
    currentPage?: number
    totalPages?: number
    extractedText?: string
    redactionLog?: any[]
    warnings?: any[]
    metadata?: any
    error?: string
    processingTimeMs?: number
    piiRiskScore?: number
    version?: string
  }
}

// =============================================================================
// MAIN PDF PROCESSING FUNCTION (v6.2.0)
// =============================================================================

async function processPDF(pdfData: ArrayBuffer, options: ProcessingOptions = {}): Promise<WorkerResponse> {
  const startTime = performance.now()

  try {
    const loadingTask = pdfjs.getDocument({ data: pdfData })
    const pdf = await loadingTask.promise
    const totalPages = pdf.numPages

    if (CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log("\n" + "=".repeat(60))
      console.log("[DIAGNOSTIC] pdfWorker v6.4.0 - Processing Started")
      console.log("=".repeat(60))
      console.log("[DIAGNOSTIC] options.enableRedaction:", options.enableRedaction)
      console.log("[DIAGNOSTIC] options.namesToRedact received:", options.namesToRedact?.length ?? 0, "names")
      if (options.namesToRedact && options.namesToRedact.length > 0) {
        options.namesToRedact.forEach((name, i) => {
          console.log(`[DIAGNOSTIC]   namesToRedact[${i}]: "${name}" (length: ${name.length})`)
        })
      }
    }

    let fullDocumentText = ""

    // Phase 1: Extract text from all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      self.postMessage({
        type: "PROGRESS",
        payload: {
          progress: (pageNum / totalPages) * 50,
          currentPage: pageNum,
          totalPages: totalPages,
        },
      } as WorkerResponse)

      const page = await pdf.getPage(pageNum)
      const pageText = await extractPageText(page)
      fullDocumentText += `\n--- PAGE ${pageNum} ---\n${pageText}\n`
    }

    if (CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log(`\n=== v6.4.0 Extraction Complete ===`)
      console.log(`Total pages: ${totalPages}`)
      console.log(`Document length: ${fullDocumentText.length}`)
    }

    // Phase 2: Scrub PII
    let finalText = fullDocumentText
    let allRedactionLogs: any[] = []
    let allWarnings: any[] = []

    if (options.enableRedaction !== false) {
      self.postMessage({
        type: "PROGRESS",
        payload: { progress: 60 },
      } as WorkerResponse)

      const namesToRedact = options.namesToRedact || []

      if (CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`\n=== v6.4.0 Starting Redaction ===`)
        console.log(`User-provided names: ${namesToRedact.length}`)
      }

      const scrubResult = scrubPIIDocumentLevel(fullDocumentText, namesToRedact)
      finalText = scrubResult.scrubbedText
      allRedactionLogs = scrubResult.redactionLog
      allWarnings = scrubResult.warnings
    }

    const processingTimeMs = Math.round(performance.now() - startTime)
    const piiRiskScore = options.enableRedaction !== false ? calculatePIIRiskScore(allRedactionLogs) : 0

    // Leak detection: Names
    const userProvidedNames = options.namesToRedact || []
    if (userProvidedNames.length > 0) {
      if (CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log("\n[DIAGNOSTIC] Running name leak detection...")
      }
      const leaksFound: string[] = []

      userProvidedNames.forEach((name) => {
        const trimmedName = name.trim()
        if (trimmedName.length > 0) {
          if (finalText.toLowerCase().includes(trimmedName.toLowerCase())) {
            leaksFound.push(trimmedName)
            if (CONFIG.ENABLE_DEBUG_LOGGING) {
              console.log(`[DIAGNOSTIC] NAME LEAK DETECTED: "${trimmedName}" still present in output!`)
              const lowerText = finalText.toLowerCase()
              const index = lowerText.indexOf(trimmedName.toLowerCase())
              const start = Math.max(0, index - 30)
              const end = Math.min(finalText.length, index + trimmedName.length + 30)
              const context = finalText.substring(start, end).replace(/\n/g, " ")
              console.log(`[DIAGNOSTIC]    Context: "...${context}..."`)
            }
          } else if (CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log(`[DIAGNOSTIC] "${trimmedName}" successfully redacted`)
          }
        }
      })

      if (leaksFound.length > 0) {
        if (CONFIG.ENABLE_DEBUG_LOGGING) {
          console.log(`\n[DIAGNOSTIC] NAME LEAK SUMMARY: ${leaksFound.length}/${userProvidedNames.length} names leaked!`)
        }
        allWarnings.push({
          type: "name_leak_detected",
          count: leaksFound.length,
          names: leaksFound,
          description: `${leaksFound.length} user-provided names were not fully redacted`,
        })
      } else if (CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log(`\n[DIAGNOSTIC] All ${userProvidedNames.length} user-provided names successfully redacted`)
      }
    }

    // Leak detection: Policy numbers
    if (CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log("\n[DIAGNOSTIC] Running policy number leak scan...")
    }
    const policyLeakPatterns = [
      /\b(?:POLICY|Policy)\s+[A-Z]?\d{6,12}[A-Z]?\b/g,
      /\b(?:CONTRACT|Contract)\s+[A-Z]?\d{6,12}[A-Z]?\b/g,
    ]

    const policyLeaks: string[] = []
    for (const pattern of policyLeakPatterns) {
      const matches = finalText.match(pattern)
      if (matches) {
        const realLeaks = matches.filter((m) => !/REDACTED/.test(m))
        realLeaks.forEach((leak) => {
          if (!policyLeaks.includes(leak)) {
            policyLeaks.push(leak)
            if (CONFIG.ENABLE_DEBUG_LOGGING) {
              console.log(`[DIAGNOSTIC] POLICY NUMBER LEAK: "${leak}"`)
            }
          }
        })
      }
    }

    if (policyLeaks.length > 0) {
      allWarnings.push({
        type: "policy_number_leak_detected",
        count: policyLeaks.length,
        values: policyLeaks,
        description: `${policyLeaks.length} policy numbers were not fully redacted`,
      })
    } else if (CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log(`[DIAGNOSTIC] No policy number leaks detected`)
    }

    if (CONFIG.ENABLE_DEBUG_LOGGING) {
      console.log("\n" + "=".repeat(60))
      console.log("[DIAGNOSTIC] pdfWorker v6.4.0 - Processing Complete")
      console.log("=".repeat(60))
      console.log(`[DIAGNOSTIC] Total processing time: ${processingTimeMs}ms`)
      console.log(`[DIAGNOSTIC] Total redaction log entries: ${allRedactionLogs.length}`)
      console.log(`[DIAGNOSTIC] Total warnings: ${allWarnings.length}`)
      console.log(`[DIAGNOSTIC] PII Risk Score: ${piiRiskScore}`)
      console.log(`[DIAGNOSTIC] Final text length: ${finalText.length} chars`)
      console.log("=".repeat(60) + "\n")
    }

    return {
      type: "COMPLETE",
      payload: {
        extractedText: finalText.trim(),
        redactionLog: allRedactionLogs,
        warnings: allWarnings,
        metadata: {
          pageCount: totalPages,
        },
        processingTimeMs,
        piiRiskScore,
        version: "6.4.0",
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[PDF Worker v6.4.0] Error:", errorMessage)

    return {
      type: "ERROR",
      payload: {
        error: errorMessage,
        version: "6.4.0",
      },
    }
  }
}

// =============================================================================
// WORKER MESSAGE HANDLER
// =============================================================================

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data

  if (type === "PROCESS_PDF") {
    const response = await processPDF(payload.pdfData, payload.options)
    self.postMessage(response)
  }
})

// Signal that worker is ready
self.postMessage({ type: "READY", payload: { version: "6.4.0" } })
