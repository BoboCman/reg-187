import { WizardProvider } from "@/lib/wizard-context";
import { WizardShell } from "@/components/WizardShell";

export const metadata = {
  title: "LIDQ — Life Insurance Design Questionnaire",
  description: "Eight-step life insurance design questionnaire with advisor-ranked design priorities.",
};

export default function LidqPage() {
  return (
    <WizardProvider>
      <WizardShell />
    </WizardProvider>
  );
}
