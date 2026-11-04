import { useId } from "react";
import { useFieldWiring } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { colourLabel } from "@/lib/colour-names";
import { modelLabel, parseModel } from "@/lib/phone-models";
import type { ColourOption, SizeOption } from "@/lib/variant-options";
import { cn } from "@/lib/utils";

/**
 * The buyer's two choices, phone model first, then colour.
 *
 * For a phone case the model decides everything: a colour is only worth
 * showing once we know it exists for the buyer's phone. So the colours appear
 * after the model is picked, each with its name, and a colour this model does
 * not come in is greyed, crossed out and cannot be picked, with
 * "currently unavailable" under its name. A product without models shows its
 * colours straight away.
 */
export function ColourPicker({
  colours,
  selected,
  onSelect,
  step,
}: {
  colours: ColourOption[];
  selected: string | null;
  onSelect: (name: string) => void;
  /** "2" when the model was picked first, so the heading reads as a step. */
  step?: string;
}) {
  const { t, locale } = useI18n();
  if (colours.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-sm">
        <span className="text-on-surface-muted">
          {step ? t("store.stepColour", { step }) : t("store.color")}:{" "}
        </span>
        <span className="font-semibold">{colourLabel(selected, locale)}</span>
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {colours.map((colour) => (
          <button
            key={colour.name}
            type="button"
            onClick={() => onSelect(colour.name)}
            disabled={!colour.inStock}
            aria-pressed={colour.name === selected}
            className={cn("colour-chip", colour.name === selected && "active")}
          >
            <span
              className="colour-dot"
              style={{ background: colour.hex ?? "var(--surface-high)" }}
              aria-hidden="true"
            />
            <span className="flex flex-col items-start leading-tight">
              <span className="colour-name">{colourLabel(colour.name, locale)}</span>
              {!colour.inStock && <span className="colour-off">{t("store.unavailableNow")}</span>}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** "15 PRO MAX" → "iPhone 15 Pro Max"; any other size name is shown as stored. */
function chipLabel(name: string): string {
  const model = parseModel(name);
  return model ? modelLabel(model) : name;
}

export function SizePicker({
  sizes,
  selected,
  onSelect,
  hideLegend = false,
}: {
  sizes: SizeOption[];
  selected: string | null;
  onSelect: (name: string) => void;
  /** The order form labels the field itself, so it asks for no second heading. */
  hideLegend?: boolean;
}) {
  const { t } = useI18n();
  const wiring = useFieldWiring(useId());
  if (sizes.length === 0) return null;

  // Inside an order-form Field the group carries the Field's id and invalid state,
  // so a missing model is announced and the form can scroll to it and focus it.
  const inField = hideLegend ? { ...wiring, tabIndex: -1 } : {};

  return (
    <fieldset className="flex flex-col gap-2.5 outline-none" {...inField}>
      <legend className={hideLegend ? "sr-only" : "mb-1 text-sm"}>
        <span className="text-on-surface-muted">{t("store.stepModel")}: </span>
        <span className="font-semibold" dir="auto">
          {selected ? chipLabel(selected) : null}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.name}
            type="button"
            onClick={() => onSelect(size.name)}
            // A model with nothing left in any colour cannot be picked.
            disabled={!size.inStock}
            aria-pressed={size.name === selected}
            // "13 PRO MAX" inside the Arabic page otherwise reads "PRO MAX 13".
            dir="auto"
            className={cn("size-chip", size.name === selected && "active")}
          >
            {chipLabel(size.name)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
