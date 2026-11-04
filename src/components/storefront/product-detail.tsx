import { useEffect, useState } from "react";
import { trackViewContent } from "@/lib/pixels";
import { useI18n } from "@/lib/i18n-context";
import {
  averageRating,
  sortVariants,
  useReviews,
  type CatalogueProduct,
  type PublicReview,
} from "@/lib/queries";
import { useVariantChoice } from "./use-variant-choice";
import { useMissingVariant } from "./use-missing-variant";
import { StarRating } from "./star-rating";
import { ProductGallery } from "./product-gallery";
import {
  ModelHelp,
  OrderActions,
  StockLine,
  useWhatsappHref,
  variantLabel,
} from "./product-purchase";
import { ExpressOrderForm, ORDER_FORM_ID } from "./express-order-form";
import { ProductShowcase } from "./product-showcase";
import { StickyOrderBar } from "./sticky-order-bar";
import { localized } from "@/lib/i18n";
import { modelOptions, modelSpan } from "@/lib/phone-models";
import { Smartphone } from "lucide-react";
import { ColourPicker, SizePicker } from "./variant-picker";
import { ModelPicker } from "./model-picker";

/**
 * Product page layout.
 *
 * Built as a landing page for ad traffic: photos, name, price, the model and
 * colour pickers, a short description, then the express order form, so a buyer
 * on a phone reads why to buy and then how, with nothing between them. The
 * three promises are in the form's own header, not above the pickers. Actions live in `product-purchase.tsx` and `express-order-form.tsx`;
 * this file holds the state they share.
 */
type ProductDetailProps = {
  product: CatalogueProduct;
  /** A model named in the link, such as "14-pro-max", to open the page on. */
  initialModel?: string;
};

export function ProductDetail({ product, initialModel }: ProductDetailProps) {
  const { t, locale } = useI18n();
  const { data: reviews } = useReviews(product.id);

  const variants = sortVariants(product.product_variants);
  const stockable = variants.filter((v) => v.stock > 0);

  useEffect(() => {
    if (product.product_variants.length === 0) return;
    const price = Math.min(...product.product_variants.map((v) => v.price));
    trackViewContent({ id: product.id, name: product.name, price, quantity: 1 });
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps -- once per product

  const {
    sizes,
    modelFirst,
    choice,
    colourChoices,
    selected,
    unavailable,
    images,
    activeImage,
    setActiveImage,
    pickColour,
    pickSize,
  } = useVariantChoice(variants, product.slug, initialModel);

  const { shownSizes, generations } = modelOptions(sizes);
  const scrollToForm = () =>
    document.getElementById(ORDER_FORM_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const { pickersRef, showPickers, showMissing, missingKey } = useMissingVariant({
    chosen: selected !== null,
  });
  const fromPrice = Math.min(...variants.map((v) => v.price));
  const name = localized(locale, product.name, product.name_fr);
  const waHref = useWhatsappHref(t("store.waOrderIntro"), name, selected);
  const label = selected ? variantLabel(selected, locale) : null;

  const description = product.description
    ? localized(locale, product.description, product.description_fr)
    : product.description_fr;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery
        images={images}
        alt={choice.colour ? `${name} — ${choice.colour}` : name}
        active={activeImage}
        onSelect={setActiveImage}
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold text-balance sm:text-3xl">{name}</h1>
          <FitsLine product={product} />
          <RatingLine reviews={reviews} />
        </div>

        <StockLine
          selected={selected}
          fromPrice={fromPrice}
          hasStock={!unavailable && (selected ? selected.stock > 0 : stockable.length > 0)}
          outLabel={unavailable ? t("store.unavailableNow") : undefined}
        />

        <div ref={pickersRef} className="flex flex-col gap-5">
          {generations ? (
            <ModelPicker generations={generations} selected={choice.size} onSelect={pickSize} />
          ) : (
            <SizePicker sizes={shownSizes} selected={choice.size} onSelect={pickSize} />
          )}
          {modelFirst && choice.size === null ? (
            <p className="text-sm text-on-surface-muted">{t("store.pickModelFirst")}</p>
          ) : (
            <ColourPicker
              colours={colourChoices}
              selected={choice.colour}
              onSelect={pickColour}
              step={modelFirst ? "2" : undefined}
            />
          )}
          {showMissing && (
            <p role="alert" className="text-sm font-medium text-error">
              {t(missingKey)}
            </p>
          )}
          {unavailable && (
            <p role="status" className="combo-off">
              <strong>{t("store.unavailableNow")}</strong>
              <span>{t("store.unavailableHint")}</span>
            </p>
          )}
          {sizes.length > 0 && <ModelHelp name={name} />}
        </div>

        {/* What the case is, above the form: the selling points a buyer on a
            phone should read before the fields, not after them. */}
        {description && <Description text={description} />}

        {stockable.length > 0 && (
          <>
            <ExpressOrderForm
              product={product}
              name={name}
              selected={selected && selected.stock > 0 ? selected : null}
              variantLabel={label === "—" ? null : label}
              model={
                sizes.length > 0
                  ? { sizes: shownSizes, generations, selected: choice.size, onSelect: pickSize }
                  : null
              }
              onMissingVariant={showPickers}
            />
            <OrderActions name={name} selected={selected} />
            <ProductShowcase slug={product.slug} />
            <StickyOrderBar
              price={selected?.price ?? fromPrice}
              onOrder={scrollToForm}
              whatsappHref={waHref}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Stars and the review count, only once the product has reviews. */
function RatingLine({ reviews }: { reviews: PublicReview[] | undefined }) {
  const { t } = useI18n();
  if (!reviews || reviews.length === 0) return null;
  return (
    <span className="flex items-center gap-2">
      <StarRating value={averageRating(reviews) ?? 0} />
      <span className="text-sm text-on-surface-muted">
        {t("reviews.count", { count: reviews.length })}
      </span>
    </span>
  );
}

/**
 * Which iPhones the case fits, straight under the name. A name such as "STYLE
 * 18 PRO MAX" describes the look, so a buyer with an iPhone 13 would otherwise
 * think it is not for them. Built from the in-stock models, so it stays true.
 */
function FitsLine({ product }: { product: CatalogueProduct }) {
  const { t } = useI18n();
  const span = modelSpan(product);
  if (!span) return null;
  // Non-breaking spaces keep "iPhone 17 Pro Max" on one line on narrow phones.
  const keep = (label: string) => label.replace(/ /g, " ");
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-on-surface-muted">
      <Smartphone size={15} className="shrink-0 text-gold-ink" aria-hidden="true" />
      {span.from === span.to
        ? t("store.fitsOne", { model: keep(span.from) })
        : t("store.fits", { from: keep(span.from), to: keep(span.to) })}
    </p>
  );
}

/**
 * The product description, four lines at first with a "more" toggle, so a long
 * one does not push the form out of sight. Short descriptions show whole.
 */
function Description({ text }: { text: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const long = text.split("\n").length > 5 || text.length > 260;

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        className={`pd-description whitespace-pre-line text-on-surface-muted ${
          long && !open ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-h-10 text-sm font-semibold text-gold-ink"
        >
          {open ? t("store.readLess") : t("store.readMore")}
        </button>
      )}
    </div>
  );
}
