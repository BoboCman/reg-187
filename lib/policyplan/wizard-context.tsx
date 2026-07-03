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

export const PP_STEP_COUNT = 7;

export const PP_STEP_META: { label: string; subtitle: string }[] = [
  { label: "Insured & owner",      subtitle: "Captures who is insured and who will own the policy." },
  { label: "Objectives",           subtitle: "The client's purpose for coverage" },
  { label: "Financial profile",    subtitle: "Enter the financial information of the policy owner. For a trust-owned policy, enter the grantor\u2019s or the premium funding source\u2019s information, not the insured\u2019s." },
  { label: "Existing coverage",    subtitle: "In-force policies and replacement intent" },
  { label: "Risk & preferences",   subtitle: "Assesses comfort with guarantees, variability, complexity, and funding obligations." },
  { label: "Policy specifications",subtitle: "Target death benefit, premium, and duration" },
  { label: "Attestation",          subtitle: "Notes, signature, and best-interest confirmation" },
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
}

const Ctx = createContext<PPWizardCtx | null>(null);

export function PPWizardProvider({ children }: { children: ReactNode }) {
  const [step, setStepRaw] = useState(1);
  const [formData, setFormData] = useState<PPFormData>({});
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [submittedIntake, setSubmittedIntake] = useState<PolicyPlanIntake | null>(null);
  const [submittedIntakeId, setSubmittedIntakeId] = useState<string | null>(null);

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
    setCompleted(new Set([1, 2, 3, 4, 5, 6, 7]));
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
