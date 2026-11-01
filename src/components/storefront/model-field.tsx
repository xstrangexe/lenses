import { Field, Select } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import type { ModelGeneration } from "@/lib/phone-models";
import type { SizeOption } from "@/lib/variant-options";
import { ModelPicker } from "./model-picker";

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
 */
export function ModelField({ choice, error }: { choice: ModelChoice; error?: string | null }) {
  const { t } = useI18n();
  return (
    <Field label={t("express.model")} error={error} required>
      {choice.generations ? (
        <ModelPicker
          generations={choice.generations}
          selected={choice.selected}
          onSelect={choice.onSelect}
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
