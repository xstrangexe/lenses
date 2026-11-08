import type { Locale } from "./i18n";

/**
 * Arabic names for the colours the catalogue spells in French or English.
 *
 * Display only: the stored colour name is still the key that variants, photos
 * and orders match on, so nothing here changes what a buyer orders. A name not
 * listed (including one the owner already wrote in Arabic) shows as it is.
 */
const AR: Record<string, string> = {
  black: "أسود",
  noir: "أسود",
  white: "أبيض",
  blue: "أزرق",
  bleu: "أزرق",
  silver: "فضي",
  red: "أحمر",
  rouge: "أحمر",
  pink: "وردي",
  orange: "برتقالي",
  brown: "بني",
  marron: "بني",
  aquamarine: "تركوازي",
  glacier: "أزرق جليدي",
  "titanium silver": "فضي تيتانيوم",
  burgundy: "عنابي",
  "lumiere blue": "أزرق فاتح",
  swarovski: "سواروفسكي",
  honey: "عسلي",
  hazel: "بندقي",
  caramel: "كراميل",
  "lumiere hazel": "بندقي فاتح",
  "blue tiffany": "أزرق تيفاني",
  ice: "جليدي",
  "sun kiss": "ذهبي دافئ",
  mel: "عسلي",
  jade: "أخضر يشم",
  grafite: "رمادي جرافيت",
  agata: "عقيق",
  ocre: "أوكر",
  avela: "بندقي داكن",
  topazio: "توباز",
  quartzo: "كوارتز",
  ambar: "عنبري",
  cristal: "كريستال",
};

export function colourLabel(name: string | null, locale: Locale): string {
  if (!name) return "";
  return (locale === "ar" && AR[name.trim().toLowerCase()]) || name;
}
