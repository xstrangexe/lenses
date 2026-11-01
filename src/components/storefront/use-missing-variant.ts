import { useRef, useState } from "react";
import type { TranslationKey } from "@/lib/i18n";

/**
 * What happens when a buyer orders before choosing a model or colour: the page
 * takes them to the pickers, focuses the first one, and says there, beside the
 * field, what is missing. The message goes away as soon as a variant is chosen.
 * Returns the key to show near the order button too.
 */
export function useMissingVariant({
  hasModels,
  modelChosen,
  chosen,
}: {
  hasModels: boolean;
  modelChosen: boolean;
  chosen: boolean;
}) {
  const pickersRef = useRef<HTMLDivElement>(null);
  const [tried, setTried] = useState(false);
  const missingKey: TranslationKey =
    hasModels && !modelChosen ? "express.pickVariant" : "express.pickColour";

  const showPickers = () => {
    setTried(true);
    pickersRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    pickersRef.current
      ?.querySelector<HTMLElement>("select, button")
      ?.focus({ preventScroll: true });
    return missingKey;
  };

  return { pickersRef, showPickers, showMissing: tried && !chosen, missingKey };
}
