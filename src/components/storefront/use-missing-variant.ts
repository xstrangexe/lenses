import { useRef, useState } from "react";
import type { TranslationKey } from "@/lib/i18n";

/**
 * What happens when a buyer orders with a model chosen but no colour: the page
 * takes them to the pickers and says there, beside the field, what is missing.
 * The message goes away as soon as a variant is chosen. (A missing model is
 * answered inside the order form instead; see `model-field.tsx`.) Returns the
 * key to show near the order button too.
 */
export function useMissingVariant({ chosen }: { chosen: boolean }) {
  const pickersRef = useRef<HTMLDivElement>(null);
  const [tried, setTried] = useState(false);
  const missingKey: TranslationKey = "express.pickColour";

  const showPickers = () => {
    setTried(true);
    pickersRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return missingKey;
  };

  return { pickersRef, showPickers, showMissing: tried && !chosen, missingKey };
}
