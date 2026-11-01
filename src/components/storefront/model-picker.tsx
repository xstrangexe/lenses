import { Select } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { modelLabel, parseModel, type ModelGeneration } from "@/lib/phone-models";
import type { SizeOption } from "@/lib/variant-options";

/**
 * The phone model as one dropdown, like the wilaya field in the order form.
 *
 * A flat list of 24 chips took about 570px of a phone screen, and every
 * shorter layout tried (numbers first, a grid) either hid the Pro and Pro Max
 * versions or read as cluttered. A native select takes one line, opens the
 * phone's own picker, and lists every model grouped by iPhone number, newest
 * first and Pro Max first, since that is what most buyers here carry.
 */
export function ModelPicker({
  generations,
  selected,
  onSelect,
}: {
  generations: ModelGeneration<SizeOption>[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const { t } = useI18n();

  return (
    <Select
      aria-label={t("store.stepModel")}
      className="max-w-sm"
      value={selected ?? ""}
      onChange={(event) => event.target.value && onSelect(event.target.value)}
    >
      <option value="" disabled>
        {t("store.stepModel")}
      </option>
      {generations.map((generation) => (
        <optgroup key={generation.number} label={`iPhone ${generation.number}`}>
          {[...generation.models].reverse().map((model) => (
            // Shown as "iPhone 15 Pro Max" however the shop stored it ("15 PRO MAX"):
            // a name that opens with Latin letters keeps its order inside the Arabic page.
            <option key={model.name} value={model.name} disabled={!model.inStock}>
              {modelLabel(parseModel(model.name)!)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
