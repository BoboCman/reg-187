import { WizardProvider } from "@/lib/wizard-context";
import { WizardShell } from "@/components/WizardShell";

export default function HomePage() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
