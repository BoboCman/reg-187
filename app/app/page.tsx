import { PPWizardProvider } from "@/lib/policyplan/wizard-context";
import { PPWizardShell } from "@/components/policyplan/PPWizardShell";

export const metadata = {
  title: "PolicyPlan — New Business Intake",
  description: "Upload the proposed illustration, answer a five-card client profile, and get a Reg 187 letter.",
};

export default function AppPage() {
  return (
    <PPWizardProvider>
      <PPWizardShell />
    </PPWizardProvider>
  );
}
