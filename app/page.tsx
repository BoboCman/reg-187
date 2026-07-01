import { PPWizardProvider } from "@/lib/policyplan/wizard-context";
import { PPWizardShell } from "@/components/policyplan/PPWizardShell";

export default function HomePage() {
  return (
    <PPWizardProvider>
      <PPWizardShell />
    </PPWizardProvider>
  );
}
