import { PPWizardProvider } from "@/lib/policyplan/wizard-context";
import { PPWizardShell } from "@/components/policyplan/PPWizardShell";

export const metadata = {
  title: "PolicyPlan — New Business Intake",
  description: "Seven-step best-interest life insurance intake for advisors.",
};

export default function AppPage() {
  return (
    <PPWizardProvider>
      <PPWizardShell />
    </PPWizardProvider>
  );
}
