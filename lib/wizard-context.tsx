"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  LidqIntake,
  InsuredInfo,
  Financial,
  ExistingInsurance,
  Objectives,
  NewPolicySpecs,
  DesignPriorities,
  RiskTolerance,
} from "@/lib/lidq-schema";

export type WizardFormData = {
  insured_info?: Partial<InsuredInfo>;
  financial?: Partial<Financial>;
  existing_insurance?: Partial<ExistingInsurance>;
  objectives?: Partial<Objectives>;
  new_policy_specs?: Partial<NewPolicySpecs>;
  design_priorities?: Partial<DesignPriorities>;
  risk_tolerance?: Partial<RiskTolerance>;
  notes?: string;
  attestation?: {
    confirmed?: boolean;
    owner_signature?: string;
    signed_date?: string;
    signer_title?: string;
  };
};

export const STEP_COUNT = 8;

export const STEP_META: { label: string; subtitle: string }[] = [
  { label: "Insured", subtitle: "Clients, ownership, and policy structure" },
  { label: "Financial", subtitle: "Income, assets, liabilities, and net worth" },
  { label: "Existing", subtitle: "Current in-force life insurance policies" },
  { label: "Objectives", subtitle: "Purpose and goals for the new policy" },
  { label: "Policy specs", subtitle: "Death benefit, premium, and cash value targets" },
  { label: "Design priorities", subtitle: "Rank the five design elements 1–5" },
  { label: "Risk tolerance", subtitle: "Ten questions on risk and investment preferences" },
  { label: "Attestation", subtitle: "Notes, signature, and Reg 187 confirmation" },
];

interface WizardCtx {
  step: number;
  formData: WizardFormData;
  setStep: (n: number) => void;
  goNext: () => void;
  goBack: () => void;
  patch: (data: Partial<WizardFormData>) => void;
  loadSample: (data: LidqIntake) => void;
  completed: Set<number>; // 1-based step numbers that have been validated
  markComplete: (step: number) => void;
  submittedIntake: LidqIntake | null;
  setSubmittedIntake: (v: LidqIntake | null) => void;
}

const Ctx = createContext<WizardCtx | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStepRaw] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({});
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [submittedIntake, setSubmittedIntake] = useState<LidqIntake | null>(null);

  const setStep = useCallback((n: number) => setStepRaw(n), []);

  const goNext = useCallback(() =>
    setStepRaw((s) => Math.min(s + 1, STEP_COUNT)), []);

  const goBack = useCallback(() =>
    setStepRaw((s) => Math.max(s - 1, 1)), []);

  const patch = useCallback((data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const loadSample = useCallback((intake: LidqIntake) => {
    setFormData({
      insured_info: intake.insured_info,
      financial: intake.financial,
      existing_insurance: intake.existing_insurance,
      objectives: intake.objectives,
      new_policy_specs: intake.new_policy_specs,
      design_priorities: intake.design_priorities,
      risk_tolerance: intake.risk_tolerance,
      notes: intake.notes,
      attestation: intake.attestation,
    });
    // Mark all steps complete when loading a sample
    setCompleted(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
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
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
