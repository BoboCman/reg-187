"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  PolicyPlanIntake,
  InsuredOwner,
  Objectives,
  Financial,
  ExistingCoverage,
  RiskPreferences,
  PolicySpecs,
  Attestation,
} from "@/lib/policyplan/schema";

export type PPFormData = {
  insured_owner?: Partial<InsuredOwner>;
  objectives?: Partial<Objectives>;
  financial?: Partial<Financial>;
  existing_coverage?: Partial<ExistingCoverage>;
  risk_preferences?: Partial<RiskPreferences>;
  policy_specs?: Partial<PolicySpecs>;
  notes?: string;
  attestation?: {
    confirmed?: true;
    owner_signature?: string;
    signed_date?: string;
    signer_title?: string;
  };
};

/** Redacted proposed-illustration text captured in the Upload step. */
export type PPIllustration = {
  text: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  redaction_counts: Record<string, number>;
  extracted_at: string;
};

export const PP_STEP_COUNT = 2;

export const PP_STEP_META: { label: string; subtitle: string }[] = [
  { label: "Goals", subtitle: "What the coverage is for, and how the client feels about risk." },
  { label: "Finances", subtitle: "The owner\u2019s income, assets and debts. For a trust-owned policy, use the grantor\u2019s or the premium payer\u2019s finances." },
];

interface PPWizardCtx {
  step: number;
  formData: PPFormData;
  setStep: (n: number) => void;
  goNext: () => void;
  goBack: () => void;
  patch: (data: Partial<PPFormData>) => void;
  loadSample: (data: PolicyPlanIntake) => void;
  completed: Set<number>;
  markComplete: (step: number) => void;
  submittedIntake: PolicyPlanIntake | null;
  setSubmittedIntake: (v: PolicyPlanIntake | null) => void;
  submittedIntakeId: string | null;
  setSubmittedIntakeId: (id: string | null) => void;
  illustration: PPIllustration | null;
  setIllustration: (v: PPIllustration | null) => void;
  /** True once the advisor has finished (or explicitly skipped) the Upload step. */
  uploadDone: boolean;
  setUploadDone: (v: boolean) => void;
}

const Ctx = createContext<PPWizardCtx | null>(null);

export function PPWizardProvider({ children }: { children: ReactNode }) {
  const [step, setStepRaw] = useState(1);
  const [formData, setFormData] = useState<PPFormData>({});
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [submittedIntake, setSubmittedIntake] = useState<PolicyPlanIntake | null>(null);
  const [submittedIntakeId, setSubmittedIntakeId] = useState<string | null>(null);
  const [illustration, setIllustration] = useState<PPIllustration | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  const setStep = useCallback((n: number) => setStepRaw(n), []);
  const goNext = useCallback(() => setStepRaw((s) => Math.min(s + 1, PP_STEP_COUNT)), []);
  const goBack = useCallback(() => setStepRaw((s) => Math.max(s - 1, 1)), []);

  const patch = useCallback((data: Partial<PPFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const loadSample = useCallback((intake: PolicyPlanIntake) => {
    setFormData({
      insured_owner: intake.insured_owner,
      objectives: intake.objectives,
      financial: intake.financial,
      existing_coverage: intake.existing_coverage,
      risk_preferences: intake.risk_preferences,
      policy_specs: intake.policy_specs,
      notes: intake.notes,
      attestation: intake.attestation,
    });
    setCompleted(new Set([1, 2]));
  }, []);

  const markComplete = useCallback((s: number) => {
    setCompleted((prev) => new Set([...prev, s]));
  }, []);

  return (
    <Ctx.Provider
      value={{
        step,
        formData,
        setStep,
        goNext,
        goBack,
        patch,
        loadSample,
        completed,
        markComplete,
        submittedIntake,
        setSubmittedIntake,
        submittedIntakeId,
        setSubmittedIntakeId,
        illustration,
        setIllustration,
        uploadDone,
        setUploadDone,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePPWizard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePPWizard must be used inside PPWizardProvider");
  return ctx;
}
