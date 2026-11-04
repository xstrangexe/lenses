import { describe, expect, it } from "vitest";
import type { CatalogueProduct } from "./queries";
import {
  availableModels,
  modelLabel,
  modelFromKey,
  modelKey,
  modelOptions,
  modelSearch,
  modelStock,
  modelGenerations,
  modelRange,
  modelSpan,
  parseModel,
  productsForModel,
  sizeForModelKey,
} from "./phone-models";

function product(id: string, sizes: [string | null, number][]): CatalogueProduct {
  return {
    id,
    slug: id,
    name: id,
    product_variants: sizes.map(([size, stock], i) => ({
      id: `${id}-${i}`,
      size,
      color_name: null,
      price: 2500,
      stock,
    })),
  } as unknown as CatalogueProduct;
}

describe("parseModel", () => {
  it("reads every way the shop writes a model", () => {
    expect(parseModel("15 PRO MAX")).toEqual({ number: 15, type: "pro max" });
    expect(parseModel("iPhone 13 Pro Max")).toEqual({ number: 13, type: "pro max" });
    expect(parseModel("14 PRO")).toEqual({ number: 14, type: "pro" });
    expect(parseModel("17")).toEqual({ number: 17, type: "base" });
    expect(parseModel("16 plus")).toEqual({ number: 16, type: "plus" });
  });

  it("ignores sizes that are not phone models", () => {
    expect(parseModel("XL")).toBeNull();
    expect(parseModel(null)).toBeNull();
  });
});

describe("model finder", () => {
  const snake = product("snake", [
    ["15 PRO MAX", 3],
    ["16 PRO MAX", 0],
    ["13 PRO MAX", 2],
  ]);
  const magsafe = product("magsafe", [
    ["15", 5],
    ["15 PRO", 1],
    ["15 PRO MAX", 4],
  ]);
  const box = product("aurabox", [[null, 9]]);

  it("lists models that are in stock, in reading order", () => {
    expect(availableModels([snake, magsafe, box]).map(modelLabel)).toEqual([
      "iPhone 13 Pro Max",
      "iPhone 15",
      "iPhone 15 Pro",
      "iPhone 15 Pro Max",
    ]);
  });

  it("finds the products that fit one model, and skips sold-out variants", () => {
    expect(
      productsForModel([snake, magsafe, box], { number: 15, type: "pro max" }).map((p) => p.id),
    ).toEqual(["snake", "magsafe"]);
    expect(productsForModel([snake, magsafe], { number: 16, type: "pro max" })).toEqual([]);
  });

  it("describes a product's model range", () => {
    expect(modelRange(snake)).toBe("13 Pro Max → 15 Pro Max");
    expect(modelRange(box)).toBeNull();
  });

  it("names the oldest and newest in-stock iPhone for the fit line", () => {
    expect(modelSpan(snake)).toEqual({ from: "iPhone 13 Pro Max", to: "iPhone 15 Pro Max" });
    expect(modelSpan(product("one", [["14", 2]]))).toEqual({ from: "iPhone 14", to: "iPhone 14" });
    expect(modelSpan(box)).toBeNull();
  });
});

describe("modelGenerations", () => {
  const size = (name: string) => ({ name, inStock: true });

  it("groups models by number, newest first, base before Pro Max", () => {
    const groups = modelGenerations([
      size("13 PRO MAX"),
      size("15"),
      size("iPhone 15 Pro Max"),
      size("13"),
      size("15 PRO"),
    ]);
    expect(groups?.map((g) => g.number)).toEqual([15, 13]);
    expect(groups?.[0].models.map((m) => m.name)).toEqual(["15", "15 PRO", "iPhone 15 Pro Max"]);
    expect(groups?.[1].models.map((m) => m.name)).toEqual(["13", "13 PRO MAX"]);
  });

  it("gives up on a list with a name it cannot read", () => {
    expect(modelGenerations([size("15 PRO"), size("Galaxy S24")])).toBeNull();
  });
});

describe("modelOptions", () => {
  const live = (name: string, inStock = true) => ({ name, inStock });

  it("lists only the in-stock iPhones, oldest first, as chips", () => {
    const { shownSizes, generations } = modelOptions([
      live("14 PRO MAX", false),
      live("iPhone 14"),
      live("iPhone 11 Pro Max"),
      live("iPhone 11"),
    ]);
    expect(shownSizes.map((s) => s.name)).toEqual(["iPhone 11", "iPhone 11 Pro Max", "iPhone 14"]);
    expect(generations).toBeNull();
  });

  it("falls back to the grouped dropdown past eight models in stock", () => {
    const many = ["11", "12", "13", "14", "15", "16", "17"].flatMap((n) => [
      live(n),
      live(`${n} PRO`),
    ]);
    const { shownSizes, generations } = modelOptions(many);
    expect(shownSizes).toHaveLength(14);
    expect(generations?.[0].number).toBe(17);
  });

  it("leaves a non-iPhone size list alone, sold-out sizes included", () => {
    const sizes = [live("S"), live("M", false)];
    expect(modelOptions(sizes)).toEqual({ shownSizes: sizes, generations: null });
  });
});

describe("model links", () => {
  it("writes a readable key that survives the router", () => {
    expect(modelKey({ number: 14, type: "pro max" })).toBe("iphone-14-pro-max");
    expect(modelKey({ number: 11, type: "base" })).toBe("iphone-11");
  });

  it("reads the key back, and the shorter forms an ad link may use", () => {
    expect(modelFromKey("iphone-14-pro-max")).toEqual({ number: 14, type: "pro max" });
    expect(modelFromKey("14-pro")).toEqual({ number: 14, type: "pro" });
    expect(modelFromKey("14")).toEqual({ number: 14, type: "base" });
    expect(modelFromKey("galaxy-s24")).toBeNull();
    expect(modelFromKey(undefined)).toBeNull();
  });

  it("takes ?model=14 as text although the router hands it over as a number", () => {
    expect(modelSearch({ model: 14 })).toEqual({ model: "14" });
    expect(modelSearch({ model: "iphone-14" })).toEqual({ model: "iphone-14" });
    expect(modelSearch({ model: { a: 1 } })).toEqual({});
  });

  it("finds the stored size a key names, only while it is in stock", () => {
    const sizes = [
      { name: "14 PRO MAX", inStock: true },
      { name: "14", inStock: false },
    ];
    expect(sizeForModelKey(sizes, "iphone-14-pro-max")).toBe("14 PRO MAX");
    expect(sizeForModelKey(sizes, "iphone-14")).toBeNull();
    expect(sizeForModelKey(sizes, "nope")).toBeNull();
  });

  it("counts the pieces that fit one model over every product", () => {
    const product = (...stocks: number[]) =>
      ({
        product_variants: stocks.map((stock) => ({ size: "14 PRO", stock })),
      }) as unknown as CatalogueProduct;
    expect(modelStock([product(1, 2), product(0, -3)], { number: 14, type: "pro" })).toBe(3);
    expect(modelStock([product(5)], { number: 13, type: "pro" })).toBe(0);
  });
});
