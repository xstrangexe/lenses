import type { CatalogueProduct } from "./queries";

/**
 * iPhone models as SHOPORA stores them in the variant "size": "15 PRO MAX",
 * "iPhone 15 Pro Max", "13", "14 PRO". Read into a number and a type so the home
 * page's model finder can show only the cases that fit a buyer's phone.
 */
export type PhoneType = "base" | "plus" | "pro" | "pro max";
export type PhoneModel = { number: number; type: PhoneType };

const TYPE_ORDER: PhoneType[] = ["base", "plus", "pro", "pro max"];

export function parseModel(size: string | null | undefined): PhoneModel | null {
  if (!size) return null;
  const s = size
    .toLowerCase()
    .replace(/iphone/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(/^(\d{1,2})(?:\s*(pro max|pro|plus))?$/);
  if (!m) return null;
  return { number: Number(m[1]), type: (m[2] as PhoneType | undefined) ?? "base" };
}

/**
 * The model as it travels in a link: "iphone-14-pro-max", "iphone-11". The word
 * keeps a bare "14" from being read as a number by the router, which would
 * quote it in the address bar.
 */
export function modelKey(model: PhoneModel): string {
  const type = model.type === "base" ? "" : `-${model.type.replace(" ", "-")}`;
  return `iphone-${model.number}${type}`;
}

/** The model a link key names ("iphone-14-pro", "14-pro" or "14"), or null. */
export function modelFromKey(key: string | undefined): PhoneModel | null {
  if (!key) return null;
  const m = key.match(/^(?:iphone-)?(\d{1,2})(?:-(pro-max|pro|plus))?$/);
  if (!m) return null;
  return {
    number: Number(m[1]),
    type: (m[2]?.replace("-", " ") as PhoneType | undefined) ?? "base",
  };
}

/** The `model` search parameter of a link, as text (the router hands `?model=14` over as a number). */
export function modelSearch(search: Record<string, unknown>): { model?: string } {
  const raw = search.model;
  return typeof raw === "string" || typeof raw === "number" ? { model: String(raw) } : {};
}

/** "15 Pro Max", "13" — how the finder labels a model. */
export function modelLabel(model: PhoneModel): string {
  const type = { base: "", plus: " Plus", pro: " Pro", "pro max": " Pro Max" }[model.type];
  return `iPhone ${model.number}${type}`;
}

/** Every model that at least one in-stock variant fits, sorted 11 → 17, base → Pro Max. */
export function availableModels(products: CatalogueProduct[]): PhoneModel[] {
  const seen = new Map<string, PhoneModel>();
  for (const product of products) {
    for (const variant of product.product_variants) {
      if (variant.stock <= 0) continue;
      const model = parseModel(variant.size);
      if (model) seen.set(`${model.number}|${model.type}`, model);
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.number - b.number || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type),
  );
}

/** How many pieces of cases that fit exactly this model are in stock, over all products. */
export function modelStock(products: CatalogueProduct[], model: PhoneModel): number {
  let pieces = 0;
  for (const product of products) {
    for (const variant of product.product_variants) {
      const m = parseModel(variant.size);
      if (m && m.number === model.number && m.type === model.type)
        pieces += Math.max(variant.stock, 0);
    }
  }
  return pieces;
}

/** The stored size name in `sizes` that a link key names, when it is in stock. */
export function sizeForModelKey<T extends { name: string; inStock: boolean }>(
  sizes: T[],
  key: string | undefined,
): string | null {
  const wanted = modelFromKey(key);
  if (!wanted) return null;
  const found = sizes.find((size) => {
    const m = parseModel(size.name);
    return size.inStock && m !== null && m.number === wanted.number && m.type === wanted.type;
  });
  return found?.name ?? null;
}

/** Products with an in-stock variant for exactly this model. */
export function productsForModel(
  products: CatalogueProduct[],
  model: PhoneModel,
): CatalogueProduct[] {
  return products.filter((product) =>
    product.product_variants.some((variant) => {
      if (variant.stock <= 0) return false;
      const m = parseModel(variant.size);
      return m !== null && m.number === model.number && m.type === model.type;
    }),
  );
}

/** "11 Pro Max → 17 Pro Max" for a product, or null when it has no phone models. */
export function modelRange(product: CatalogueProduct): string | null {
  const span = modelSpan(product);
  if (!span) return null;
  const first = span.from.replace("iPhone ", "");
  const last = span.to.replace("iPhone ", "");
  return first === last ? first : `${first} → ${last}`;
}

/** The oldest and newest in-stock iPhone a product fits, or null when it has none. */
export function modelSpan(product: CatalogueProduct): { from: string; to: string } | null {
  const models = availableModels([product]);
  if (models.length === 0) return null;
  return { from: modelLabel(models[0]), to: modelLabel(models[models.length - 1]) };
}

/** Up to this many in-stock models are shown as chips; more fall back to the dropdown. */
const MODEL_CHIP_MAX = 8;

/**
 * The models a buyer can actually order, oldest to newest, base → Pro Max, for a
 * list made only of iPhone names. Null when any name is not an iPhone model, so
 * a size list such as S / M / L keeps its own picker with sold-out sizes shown.
 */
function liveModelSizes<T extends { name: string; inStock: boolean }>(sizes: T[]): T[] | null {
  const parsed: { model: PhoneModel; size: T }[] = [];
  for (const size of sizes) {
    const model = parseModel(size.name);
    if (!model) return null;
    if (size.inStock) parsed.push({ model, size });
  }
  return parsed
    .sort(
      (a, b) =>
        a.model.number - b.model.number ||
        TYPE_ORDER.indexOf(a.model.type) - TYPE_ORDER.indexOf(b.model.type),
    )
    .map((entry) => entry.size);
}

/**
 * How a product's models are offered. iPhone models: the ones in stock as chips
 * (a sold-out model is not an option, so it is not listed), or, past
 * MODEL_CHIP_MAX, a dropdown grouped by iPhone number. Other size lists stay
 * flat with sold-out sizes crossed out.
 */
export function modelOptions<T extends { name: string; inStock: boolean }>(sizes: T[]) {
  const live = liveModelSizes(sizes);
  const chips = live !== null && live.length <= MODEL_CHIP_MAX;
  return {
    shownSizes: chips ? live : sizes,
    generations: live !== null && !chips ? modelGenerations(sizes) : null,
  };
}

export type ModelGeneration<T extends { name: string }> = { number: number; models: T[] };

/**
 * A product's model list grouped by iPhone number, newest first, each group in
 * base → Pro Max order. Null when any model is not an iPhone name the shop
 * uses, so the page falls back to the plain list instead of hiding a model.
 */
export function modelGenerations<T extends { name: string }>(
  sizes: T[],
): ModelGeneration<T>[] | null {
  const groups = new Map<number, { model: PhoneModel; size: T }[]>();
  for (const size of sizes) {
    const model = parseModel(size.name);
    if (!model) return null;
    groups.set(model.number, [...(groups.get(model.number) ?? []), { model, size }]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([number, list]) => ({
      number,
      models: list
        .sort((a, b) => TYPE_ORDER.indexOf(a.model.type) - TYPE_ORDER.indexOf(b.model.type))
        .map((entry) => entry.size),
    }));
}
