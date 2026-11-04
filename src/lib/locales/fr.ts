import type { TranslationKey } from "../i18n";
import { frAdmin } from "./fr.admin";
import { frTools } from "./fr.tools";
import { frStorefront } from "./fr.storefront";
import { frOrder } from "./fr.order";
import { frTrack } from "./fr.track";
import { frStock } from "./fr.stock";

/** Mirrors the Arabic keys exactly; a missing key is a compile error. */
export const fr: Record<TranslationKey, string> = {
  ...frStorefront,
  ...frOrder,
  ...frTrack,
  ...frStock,
  ...frAdmin,
  ...frTools,
};
