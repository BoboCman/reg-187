"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import {
  insuredOwnerSchema,
  type InsuredOwner,
  businessTypeEnum,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PP_SAMPLE_CASE } from "@/lib/policyplan/sample-case";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
];

const YES_NO = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const OWNERSHIP_OPTIONS = [
  { value: "individual" as const, label: "Individual" },
  { value: "business" as const, label: "Business" },
  { value: "trust" as const, label: "Trust" },
];

const TRUST_OPTIONS = [
  { value: "irrevocable" as const, label: "Irrevocable" },
  { value: "revocable" as const, label: "Revocable" },
];

const BUSINESS_TYPE_OPTIONS: Array<{ value: typeof businessTypeEnum._type; label: string }> = [
  { value: "c_corp", label: "C corporation" },
  { value: "s_corp", label: "S corporation" },
  { value: "llc", label: "LLC" },
  { value: "limited_partnership", label: "Limited partnership" },
  { value: "sole_proprietorship", label: "Sole proprietorship" },
];

// Ownership relationship — UI-only state, not a schema field.
type OwnerRelationship =
  | "same_as_insured"      // single insured
  | "same_as_insured_1"    // dual insured
  | "same_as_insured_2"    // dual insured
  | "joint"                // dual insured
  | "different";           // any case

// Derive initial relationship from saved form data on re-mount.
function inferInitialRelationship(
  saved: InsuredOwner | undefined,
  insuredCount: number
): OwnerRelationship {
  if (!saved?.policy_owner) return insuredCount > 1 ? "same_as_insured_1" : "same_as_insured";
  const owner = saved.policy_owner.trim().toLowerCase();
  const name1 = (saved.insureds?.[0]?.name ?? "").trim().toLowerCase();
  const name2 = (saved.insureds?.[1]?.name ?? "").trim().toLowerCase();
  if (insuredCount <= 1) {
    return owner === name1 ? "same_as_insured" : "different";
  }
  if (owner === name1) return "same_as_insured_1";
  if (owner === name2) return "same_as_insured_2";
  if (name1 && name2 && owner === `${name1} & ${name2}`) return "joint";
  return "different";
}

// ── Component ──────────────────────────────────────────────────────────────

export function PPStep1InsuredOwner() {
  const { formData, patch, markComplete, goNext, loadSample } = usePPWizard();
  const saved = formData.insured_owner as InsuredOwner | undefined;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InsuredOwner>({
    resolver: zodResolver(insuredOwnerSchema),
    defaultValues: saved ?? {
      insureds: [{ name: "" }],
      ownership_type: "individual",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "insureds" });
  const ownershipType = watch("ownership_type");
  const insured1Name = watch("insureds.0.name") ?? "";
  const insured2Name = watch("insureds.1.name") ?? "";
  const isDual = fields.length > 1;

  // UI-only ownership relationship state
  const [ownerRel, setOwnerRel] = useState<OwnerRelationship>(() =>
    inferInitialRelationship(saved, saved?.insureds?.length ?? 1)
  );

  // Sync form when saved data reloads (e.g. loadSample)
  useEffect(() => {
    if (formData.insured_owner) {
      const next = formData.insured_owner as InsuredOwner;
      reset(next);
      setOwnerRel(inferInitialRelationship(next, next.insureds?.length ?? 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.insured_owner]);

  // Derive the mirrored owner value for the current relationship.
  function mirroredOwner(rel: OwnerRelationship): string {
    if (rel === "same_as_insured") return insured1Name;
    if (rel === "same_as_insured_1") return insured1Name;
    if (rel === "same_as_insured_2") return insured2Name;
    if (rel === "joint") {
      const n1 = insured1Name.trim();
      const n2 = insured2Name.trim();
      return n1 && n2 ? `${n1} & ${n2}` : n1 || n2;
    }
    return "";
  }

  // Apply mirrored owner when a same-owner relationship is active.
  function applyMirror(rel: OwnerRelationship) {
    if (rel !== "different") {
      setValue("policy_owner", mirroredOwner(rel), { shouldValidate: false });
    }
  }

  // When insured 1 name changes, keep mirroring if applicable.
  useEffect(() => {
    applyMirror(ownerRel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insured1Name]);

  // When insured 2 name changes, keep mirroring if applicable.
  useEffect(() => {
    if (ownerRel === "same_as_insured_2" || ownerRel === "joint") {
      applyMirror(ownerRel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insured2Name]);

  // When relationship changes: apply mirror or switch ownership_type for "different".
  function handleRelChange(rel: OwnerRelationship) {
    setOwnerRel(rel);
    if (rel !== "different") {
      setValue("policy_owner", mirroredOwner(rel), { shouldValidate: false });
      // Clear owner-type / trust / business when returning to same-owner
      setValue("ownership_type", "individual", { shouldValidate: false });
    }
  }

  // When second insured is added: shift to dual-insured relationship options.
  function handleAddSecondInsured() {
    append({ name: "" });
    if (ownerRel === "same_as_insured") {
      handleRelChange("same_as_insured_1");
    }
  }

  // When second insured is removed: shift back to single-insured options.
  function handleRemoveSecondInsured(idx: number) {
    remove(idx);
    if (ownerRel === "same_as_insured_2" || ownerRel === "joint") {
      handleRelChange("same_as_insured");
    } else if (ownerRel === "same_as_insured_1") {
      handleRelChange("same_as_insured");
    }
  }

  const isDifferentOwner = ownerRel === "different";

  // Ownership relationship options vary by insured count
  const singleOwnerOptions = [
    { value: "same_as_insured" as OwnerRelationship, label: "Same as insured" },
    { value: "different" as OwnerRelationship, label: "Different owner" },
  ];
  const dualOwnerOptions = [
    { value: "same_as_insured_1" as OwnerRelationship, label: "Same as Insured 1" },
    { value: "same_as_insured_2" as OwnerRelationship, label: "Same as Insured 2" },
    { value: "joint" as OwnerRelationship, label: "Jointly owned" },
    { value: "different" as OwnerRelationship, label: "Different owner" },
  ];

  const onValid = (data: InsuredOwner) => {
    // Freeze the mirrored value into policy_owner before saving.
    if (!isDifferentOwner) {
      data.policy_owner = mirroredOwner(ownerRel) || data.insureds[0]?.name;
    }
    patch({ insured_owner: data });
    markComplete(1);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {/* Page intro */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Start with who is insured and who will own the policy.
        </p>
        <button
          type="button"
          onClick={() => loadSample(PP_SAMPLE_CASE)}
          className="shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline px-3 py-1.5 border border-[var(--color-accent)] rounded transition-colors"
        >
          Load sample case
        </button>
      </div>

      {/* ── Insured section ── */}
      <div className="space-y-4">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {fields.length > 1 ? `Insured ${idx + 1}` : "Insured"}
                </span>
              </div>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSecondInsured(idx)}
                  className="flex items-center gap-1 text-xs text-[var(--color-error)] hover:underline"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Full legal name"
                  error={errors.insureds?.[idx]?.name?.message}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    {...register(`insureds.${idx}.name`)}
                    placeholder="Full legal name"
                    error={!!errors.insureds?.[idx]?.name}
                  />
                </FormField>

                <FormField label="Date of birth" error={errors.insureds?.[idx]?.dob?.message}>
                  <TextInput
                    {...register(`insureds.${idx}.dob`)}
                    type="date"
                    error={!!errors.insureds?.[idx]?.dob}
                  />
                </FormField>

                <FormField label="Gender">
                  <SegmentedControl
                    options={GENDER_OPTIONS}
                    value={watch(`insureds.${idx}.gender`)}
                    onChange={(v) =>
                      setValue(`insureds.${idx}.gender`, v, { shouldValidate: true })
                    }
                  />
                </FormField>

                <FormField label="Nicotine use in last 3 years" className="sm:col-span-2">
                  <SegmentedControl
                    options={YES_NO}
                    value={watch(`insureds.${idx}.nicotine_use`)}
                    onChange={(v) =>
                      setValue(`insureds.${idx}.nicotine_use`, v, { shouldValidate: true })
                    }
                  />
                </FormField>
              </div>
            </div>
          </div>
        ))}

        {/* Add second insured action */}
        {fields.length < 2 && (
          <button
            type="button"
            onClick={handleAddSecondInsured}
            className="w-full flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border-strong)] px-5 py-4 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors bg-[var(--color-surface)]"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-readonly-bg)] border border-[var(--color-border)]">
              <Plus size={14} />
            </span>
            <div className="text-left">
              <p className="font-medium text-sm">Add second insured</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                For survivorship or joint-life cases
              </p>
            </div>
          </button>
        )}
      </div>

      {/* ── Ownership section ── */}
      <div className="mt-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Policy ownership
          </span>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Ownership relationship question */}
          <FormField label="Who owns the policy?">
            <SegmentedControl
              options={isDual ? dualOwnerOptions : singleOwnerOptions}
              value={ownerRel}
              onChange={handleRelChange}
            />
          </FormField>

          {/* Same-owner summary row */}
          {!isDifferentOwner && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Policy owner
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">
                {mirroredOwner(ownerRel) || (
                  <span className="text-[var(--color-text-muted)] italic">
                    Enter insured name above
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Different owner branch */}
          {isDifferentOwner && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-4 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Owner details
              </p>

              {/* A. Owner type */}
              <FormField label="Owner type">
                <SegmentedControl
                  options={OWNERSHIP_OPTIONS}
                  value={ownershipType}
                  onChange={(v) => setValue("ownership_type", v, { shouldValidate: true })}
                />
              </FormField>

              {/* B. Owner name / entity */}
              <FormField label="Policy owner">
                <TextInput {...register("policy_owner")} placeholder="Name or entity" />
              </FormField>

              {/* C. State of ownership */}
              <FormField
                label="State of ownership"
                hint="2-letter state code"
                error={errors.state_of_ownership?.message}
              >
                <TextInput
                  {...register("state_of_ownership")}
                  placeholder="NY"
                  maxLength={2}
                  className="uppercase w-24"
                />
              </FormField>

              {/* Business details subcard */}
              {ownershipType === "business" && (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                    Business details
                  </p>
                  <FormField
                    label="Business entity type"
                    error={errors.business_type?.message}
                    required
                  >
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_TYPE_OPTIONS.map((opt) => {
                        const isSelected = watch("business_type") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setValue("business_type", opt.value, { shouldValidate: true })
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                              isSelected
                                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.business_type && (
                      <p className="mt-1 text-xs text-[var(--color-error)]">
                        {errors.business_type.message}
                      </p>
                    )}
                  </FormField>
                </div>
              )}

              {/* Trust details subcard */}
              {ownershipType === "trust" && (
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                    Trust details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Trust type" error={errors.trust_type?.message} required>
                      <SegmentedControl
                        options={TRUST_OPTIONS}
                        value={watch("trust_type")}
                        onChange={(v) => setValue("trust_type", v, { shouldValidate: true })}
                      />
                    </FormField>

                    <FormField label="Grantor trust">
                      <SegmentedControl
                        options={YES_NO}
                        value={watch("grantor_trust")}
                        onChange={(v) =>
                          setValue("grantor_trust", v, { shouldValidate: true })
                        }
                      />
                    </FormField>

                    <FormField label="GST exempt">
                      <SegmentedControl
                        options={YES_NO}
                        value={watch("gst_exempt")}
                        onChange={(v) => setValue("gst_exempt", v, { shouldValidate: true })}
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
