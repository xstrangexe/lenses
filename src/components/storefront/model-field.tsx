import { useState } from "react";
import { Field, Select } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { modelLabel, parseModel, type ModelGeneration } from "@/lib/phone-models";
import type { SizeOption } from "@/lib/variant-options";
import { ModelPicker } from "./model-picker";
import { SizePicker } from "./variant-picker";

/** The phone model as the product page holds it, handed to the order form. */
export type ModelChoice = {
  sizes: SizeOption[];
  /** iPhone models grouped by number, or null for a short or non-iPhone list. */
  generations: ModelGeneration<SizeOption>[] | null;
  selected: string | null;
  onSelect: (name: string) => void;
};

/**
 * The model, as the first field of the order form. The picker above the form
 * stays (it changes the photos and colours), but a buyer who reaches the form
 * without a model should meet the question and its message here, where they are
 * about to order, not be sent back up the page. Both controls share one state.
 *
 * A buyer who already chose above is not asked again: the field shows their
 * model with an edit button, and opens the chips only if they want to change it.
 */
export function ModelField({ choice, error }: { choice: ModelChoice; error?: string | null }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const isPhone = choice.sizes.every((size) => parseModel(size.name) !== null);
  const model = parseModel(choice.selected);

  if (isPhone && !choice.generations && model && !editing) {
    return (
      <Field label={t("express.model")} error={error} required>
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-outline px-4">
          <span className="font-semibold" dir="auto">
            {modelLabel(model)}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-11 px-2 text-sm font-semibold text-gold-ink"
          >
            {t("common.edit")}
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field label={t("express.model")} error={error} required>
      {choice.generations ? (
        <ModelPicker
          generations={choice.generations}
          selected={choice.selected}
          onSelect={choice.onSelect}
        />
      ) : isPhone ? (
        <SizePicker
          sizes={choice.sizes}
          selected={choice.selected}
          hideLegend
          onSelect={(name) => {
            choice.onSelect(name);
            setEditing(false);
          }}
        />
      ) : (
        <Select
          value={choice.selected ?? ""}
          onChange={(event) => event.target.value && choice.onSelect(event.target.value)}
        >
          <option value="" disabled>
            {t("store.stepModel")}
          </option>
          {choice.sizes.map((size) => (
            <option key={size.name} value={size.name} disabled={!size.inStock}>
              {size.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
