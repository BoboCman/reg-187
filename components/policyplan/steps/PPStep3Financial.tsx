"use client";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  financialSchema,
  deriveFinancialTotals,
  type Financial,
  type FinancialColumn,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput, PercentInput, ReadonlyMoney, TextInput } from "@/components/ui/inputs";

const EMPTY_COL: Partial<FinancialColumn> = {
  annual_income: undefined,
  income_tax_rate: undefined,
  cash_cds_securities: undefined,
  qualified_plans: undefined,
  business_interests: undefined,
  real_estate: undefined,
  residence: undefined,
  other_assets: undefined,
  mortgage_amount: undefined,
  revolving_debt: undefined,
  other_liability_amount: undefined,
};

function FinancialColumn({
  title,
  prefix,
  control,
  errors,
}: {
  title: string;
  prefix: "columns.client_1" | "columns.client_2" | "columns.joint";
  control: ReturnType<typeof useForm<Financial>>["control"];
  errors: ReturnType<typeof useForm<Financial>>["formState"]["errors"];
}) {
  const col = useWatch({ control, name: prefix }) as Partial<FinancialColumn> | undefined;
  const totals = deriveFinancialTotals((col ?? {}) as FinancialColumn);

  const fieldError = (name: string) => {
    const parts = name.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = errors;
    for (const p of parts) obj = obj?.[p];
    return obj?.message as string | undefined;
  };

  return (
    <PPSectionCard title={title} className="flex-1 min-w-0">
      <div className="space-y-3">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Income</p>
        <FormField label="Annual income" error={fieldError(`${prefix}.annual_income`)}>
          <Controller
            control={control}
            name={`${prefix}.annual_income` as Parameters<typeof control.register>[0]}
            render={({ field }) => (
              <MoneyInput value={field.value as number | undefined} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField label="Income tax rate" error={fieldError(`${prefix}.income_tax_rate`)}>
          <Controller
            control={control}
            name={`${prefix}.income_tax_rate` as Parameters<typeof control.register>[0]}
            render={({ field }) => (
              <PercentInput value={field.value as number | undefined} onChange={field.onChange} />
            )}
          />
        </FormField>

        <p className="pt-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Assets</p>
        {([
          ["cash_cds_securities", "Cash, CDs, and securities"],
          ["qualified_plans", "Qualified retirement plans"],
          ["business_interests", "Business interests"],
          ["real_estate", "Investment real estate"],
          ["residence", "Primary residence"],
          ["other_assets", "Other assets"],
        ] as [keyof FinancialColumn, string][]).map(([key, label]) => (
          <FormField key={key} label={label}>
            <Controller
              control={control}
              name={`${prefix}.${key}` as Parameters<typeof control.register>[0]}
              render={({ field }) => (
                <MoneyInput value={field.value as number | undefined} onChange={field.onChange} />
              )}
            />
          </FormField>
        ))}

        <p className="pt-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Liabilities</p>
        {([
          ["mortgage_amount", "Mortgage balance"],
          ["revolving_debt", "Revolving / credit debt"],
          ["other_liability_amount", "Other liabilities"],
        ] as [keyof FinancialColumn, string][]).map(([key, label]) => (
          <FormField key={key} label={label}>
            <Controller
              control={control}
              name={`${prefix}.${key}` as Parameters<typeof control.register>[0]}
              render={({ field }) => (
                <MoneyInput value={field.value as number | undefined} onChange={field.onChange} />
              )}
            />
          </FormField>
        ))}

        <p className="pt-2 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Derived totals</p>
        <ReadonlyMoney value={totals.total_liquid_assets} label="Total liquid assets" />
        <ReadonlyMoney value={totals.total_assets} label="Total assets" />
        <ReadonlyMoney value={totals.total_liabilities} label="Total liabilities" />
        <ReadonlyMoney value={totals.net_worth} label="Net worth" />
        <ReadonlyMoney value={totals.liquid_net_worth} label="Liquid net worth" className="font-semibold" />
      </div>
    </PPSectionCard>
  );
}

export function PPStep3Financial() {
  const { formData, patch, markComplete, goNext } = usePPWizard();
  const hasSecondInsured = (formData.insured_owner?.insureds?.length ?? 1) > 1;

  const { control, handleSubmit, reset, register, formState: { errors } } = useForm<Financial>({
    resolver: zodResolver(financialSchema),
    defaultValues: formData.financial ?? {
      expected_source_of_premium: "",
      columns: { client_1: EMPTY_COL },
    },
  });

  useEffect(() => {
    if (formData.financial) reset(formData.financial as Financial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.financial]);

  const onValid = (data: Financial) => {
    patch({ financial: data });
    markComplete(3);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="mb-5">
        <FormField label="Expected source of premium funds">
          <TextInput
            {...register("expected_source_of_premium")}
            placeholder="e.g. annual exclusion gifts, business cash flow, personal savings"
          />
        </FormField>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <FinancialColumn
          title={hasSecondInsured ? "Client 1" : "Financial profile"}
          prefix="columns.client_1"
          control={control}
          errors={errors}
        />
        {hasSecondInsured && (
          <FinancialColumn
            title="Client 2"
            prefix="columns.client_2"
            control={control}
            errors={errors}
          />
        )}
        {hasSecondInsured && (
          <FinancialColumn
            title="Joint"
            prefix="columns.joint"
            control={control}
            errors={errors}
          />
        )}
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
