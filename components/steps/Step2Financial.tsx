"use client";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  financialSchema,
  deriveFinancialTotals,
  type Financial,
  type FinancialColumn,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput, PercentInput, ReadonlyMoney, TextArea } from "@/components/ui/inputs";
import { CopyIcon } from "lucide-react";
import { useEffect } from "react";

type ColKey = "client_1" | "client_2" | "joint";

const COL_LABELS: Record<ColKey, string> = {
  client_1: "Client 1",
  client_2: "Client 2",
  joint: "Joint",
};

const EMPTY_COL: Partial<FinancialColumn> = {};

function useFinancialTotals(col: Partial<FinancialColumn>) {
  return deriveFinancialTotals(col as FinancialColumn);
}

interface ColPanelProps {
  colKey: ColKey;
  control: any;
  errors: any;
  totals: ReturnType<typeof deriveFinancialTotals>;
  onCopyFromClient1?: () => void;
  showCopy?: boolean;
}

function ColPanel({ colKey, control, errors, totals, onCopyFromClient1, showCopy }: ColPanelProps) {
  const prefix = `columns.${colKey}` as const;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {COL_LABELS[colKey]}
        </h3>
        {showCopy && onCopyFromClient1 && (
          <button
            type="button"
            onClick={onCopyFromClient1}
            className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          >
            <CopyIcon size={12} />
            Same as Client 1
          </button>
        )}
      </div>

      {/* Income */}
      <RowLabel label="Annual income" />
      <Controller
        control={control}
        name={`${prefix}.annual_income`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Income tax rate" />
      <Controller
        control={control}
        name={`${prefix}.income_tax_rate`}
        render={({ field }) => (
          <PercentInput value={field.value} onChange={field.onChange} />
        )}
      />

      {/* Liquid assets */}
      <RowLabel label="Cash / CDs / securities" section="Liquid assets" />
      <Controller
        control={control}
        name={`${prefix}.cash_cds_securities`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Qualified plans" />
      <Controller
        control={control}
        name={`${prefix}.qualified_plans`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <ReadonlyMoney value={totals.total_liquid_assets} label="Total liquid assets" className="text-xs" />

      {/* Other assets */}
      <RowLabel label="Business interests" section="Other assets" />
      <Controller
        control={control}
        name={`${prefix}.business_interests`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Real estate" />
      <Controller
        control={control}
        name={`${prefix}.real_estate`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Residence" />
      <Controller
        control={control}
        name={`${prefix}.residence`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Other assets" />
      <Controller
        control={control}
        name={`${prefix}.other_assets`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <ReadonlyMoney value={totals.total_assets} label="Total assets" className="text-xs" />

      {/* Liabilities */}
      <RowLabel label="Mortgage" section="Liabilities" />
      <Controller
        control={control}
        name={`${prefix}.mortgage_amount`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Revolving debt" />
      <Controller
        control={control}
        name={`${prefix}.revolving_debt`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <RowLabel label="Other liabilities" />
      <Controller
        control={control}
        name={`${prefix}.other_liability_amount`}
        render={({ field }) => (
          <MoneyInput value={field.value} onChange={field.onChange} />
        )}
      />

      <ReadonlyMoney value={totals.total_liabilities} label="Total liabilities" className="text-xs" />

      {/* Net worth rows */}
      <ReadonlyMoney value={totals.net_worth} label="Net worth" className="font-semibold text-xs" />
      <ReadonlyMoney value={totals.liquid_net_worth} label="Liquid net worth" className="font-semibold text-xs border-[var(--color-accent-ring)]" />
    </div>
  );
}

function RowLabel({ label, section }: { label: string; section?: string }) {
  return (
    <div className={section ? "pt-3" : ""}>
      {section && (
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
          {section}
        </p>
      )}
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
    </div>
  );
}

export function Step2Financial() {
  const { formData, patch, goNext, markComplete } = useWizard();

  const hasClient2 = (formData.insured_info?.clients?.length ?? 1) > 1;

  const {
    control,
    handleSubmit,
    setValue,
    reset,
  } = useForm<Financial>({
    resolver: zodResolver(financialSchema),
    defaultValues: formData.financial ?? {
      expected_source_of_premium: "",
      columns: {
        client_1: EMPTY_COL,
        client_2: EMPTY_COL,
        joint: EMPTY_COL,
      },
      financial_goals_and_objectives: "",
    },
  });

  useEffect(() => {
    if (formData.financial) {
      reset(formData.financial as Financial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.financial]);

  const watched = useWatch({ control });
  const col1 = (watched.columns?.client_1 ?? {}) as Partial<FinancialColumn>;
  const col2 = (watched.columns?.client_2 ?? {}) as Partial<FinancialColumn>;
  const colJ = (watched.columns?.joint ?? {}) as Partial<FinancialColumn>;
  const totals1 = useFinancialTotals(col1);
  const totals2 = useFinancialTotals(col2);
  const totalsJ = useFinancialTotals(colJ);

  const copyClient1ToJoint = () => {
    const c1 = watched.columns?.client_1;
    if (c1) {
      const fields: (keyof FinancialColumn)[] = [
        "annual_income", "income_tax_rate", "cash_cds_securities", "qualified_plans",
        "business_interests", "real_estate", "residence", "other_assets",
        "mortgage_amount", "mortgage_duration_years", "revolving_debt",
        "other_liability_amount", "other_liability_duration_years",
      ];
      fields.forEach((f) => setValue(`columns.joint.${f}` as any, (c1 as any)[f]));
    }
  };

  const onContinue = handleSubmit((data) => {
    patch({ financial: data });
    markComplete(2);
    goNext();
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Expected source of premium">
        <Controller
          control={control}
          name="expected_source_of_premium"
          render={({ field }) => (
            <input
              type="text"
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="e.g. Annual gift from trust, business income, personal savings…"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] min-h-[44px]"
            />
          )}
        />
      </SectionCard>

      <SectionCard title="Financial profile">
        <div className={`grid gap-6 ${hasClient2 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          <ColPanel
            colKey="client_1"
            control={control}
            errors={{}}
            totals={totals1}
          />
          {hasClient2 && (
            <ColPanel
              colKey="client_2"
              control={control}
              errors={{}}
              totals={totals2}
            />
          )}
          <ColPanel
            colKey="joint"
            control={control}
            errors={{}}
            totals={totalsJ}
            showCopy
            onCopyFromClient1={copyClient1ToJoint}
          />
        </div>
      </SectionCard>

      <SectionCard title="Financial goals and objectives">
        <Controller
          control={control}
          name="financial_goals_and_objectives"
          render={({ field }) => (
            <TextArea
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="Describe the client's financial goals and objectives…"
              rows={4}
            />
          )}
        />
      </SectionCard>

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
