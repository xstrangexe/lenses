import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { colourLabel } from "@/lib/colour-names";
import { formatDzd } from "@/lib/format";
import { localized } from "@/lib/i18n";
import {
  availableModels,
  modelFromKey,
  modelKey,
  modelLabel,
  modelStock,
  parseModel,
  type PhoneModel,
} from "@/lib/phone-models";
import { productImage, type CatalogueProduct } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ModelHelp } from "./product-purchase";

/**
 * The page an ad points to: the buyer says which iPhone they have, and sees
 * only the cases that exist for it, with the real number left once it is three
 * or fewer. The count is the stock itself, never a figure made up for urgency.
 */
export function StockLanding({
  products,
  selectedKey,
  onSelect,
}: {
  products: CatalogueProduct[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const { t } = useI18n();
  const models = availableModels(products);
  // After a tap the cases may be below the chips on a phone: bring them up. A
  // link that opens on a model stays at the top, where the question is.
  const results = useRef<HTMLElement>(null);
  const picked = useRef(false);
  // A link may name the phone as "iphone-14-pro", "14-pro" or "14".
  const wanted = modelFromKey(selectedKey ?? undefined);
  const selected =
    models.find((m) => wanted !== null && m.number === wanted.number && m.type === wanted.type) ??
    null;
  const selectedId = selected ? modelKey(selected) : null;
  useEffect(() => {
    if (picked.current && selectedId) {
      results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  return (
    <div className="container-page flex flex-col gap-6 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold text-balance sm:text-3xl">
          {t("stock.title")}
        </h1>
        <p className="text-on-surface-muted">{t("stock.sub")}</p>
      </header>

      {models.length === 0 ? (
        <p role="status" className="text-on-surface-muted">
          {t("stock.empty")}
        </p>
      ) : (
        <fieldset className="flex flex-wrap gap-2.5">
          <legend className="sr-only">{t("stock.title")}</legend>
          {models.map((model) => (
            <ModelChip
              key={modelKey(model)}
              model={model}
              pieces={modelStock(products, model)}
              active={selected !== null && modelKey(selected) === modelKey(model)}
              onSelect={() => {
                picked.current = true;
                onSelect(modelKey(model));
              }}
            />
          ))}
        </fieldset>
      )}

      {selected ? (
        <Cases ref={results} products={products} model={selected} />
      ) : (
        models.length > 0 && <p className="text-sm text-on-surface-muted">{t("stock.pick")}</p>
      )}

      <ModelHelp name="" />
    </div>
  );
}

function ModelChip({
  model,
  pieces,
  active,
  onSelect,
}: {
  model: PhoneModel;
  pieces: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const tag =
    pieces === 1 ? t("stock.last") : pieces <= 3 ? t("store.lowStock", { count: pieces }) : "";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      dir="auto"
      className={cn("size-chip inline-flex items-center gap-2", active && "active")}
    >
      {modelLabel(model)}
      {tag && (
        <span className={cn("text-xs", active ? "text-on-primary" : "text-gold-ink")}>{tag}</span>
      )}
    </button>
  );
}

/** The cases that come in this exact model, each opening its page on that model. */
function Cases({
  products,
  model,
  ref,
}: {
  products: CatalogueProduct[];
  model: PhoneModel;
  ref: React.Ref<HTMLElement>;
}) {
  const { t, locale } = useI18n();
  const fits = (size: string | null) => {
    const m = parseModel(size);
    return m !== null && m.number === model.number && m.type === model.type;
  };

  return (
    <section ref={ref} aria-live="polite" className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">
        {t("stock.casesFor", { model: modelLabel(model) })}
      </h2>
      {products.map((product) => {
        const variants = product.product_variants.filter((v) => v.stock > 0 && fits(v.size));
        if (variants.length === 0) return null;
        const colours = [...new Set(variants.map((v) => v.color_name).filter(Boolean))];
        const price = Math.min(...variants.map((v) => v.price));
        const image = productImage(product);
        return (
          <Link
            key={product.id}
            to="/product/$slug"
            params={{ slug: product.slug }}
            search={{ model: modelKey(model) }}
            className="flex items-center gap-3 rounded-lg border border-outline bg-surface p-3"
          >
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-high">
              {image ? (
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <ImageOff size={28} aria-hidden="true" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold" dir="auto">
                {localized(locale, product.name, product.name_fr)}
              </span>
              {colours.length > 0 && (
                <span className="text-sm text-on-surface-muted">
                  {colours.map((c) => colourLabel(c, locale)).join(" · ")}
                </span>
              )}
              <span dir="ltr" className="text-start font-bold text-gold-ink">
                {formatDzd(price, locale)}
              </span>
            </span>
            <span className="btn btn-gold btn-sm shrink-0">{t("express.cta")}</span>
          </Link>
        );
      })}
    </section>
  );
}
