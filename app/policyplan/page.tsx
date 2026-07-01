import { PPWizardProvider } from "@/lib/policyplan/wizard-context";
import { PPWizardShell } from "@/components/policyplan/PPWizardShell";

export const metadata = {
  title: "PolicyPlan — Best-Interest Life Insurance Intake",
  description:
    "A seven-step best-interest life insurance intake for advisors. Part of the Insurance Planner AI Professional platform.",
};

export default function PolicyPlanPage() {
  return (
    <PPWizardProvider>
      <PPWizardShell />
    </PPWizardProvider>
  );
}
