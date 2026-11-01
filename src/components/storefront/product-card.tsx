import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { formatDzd } from "@/lib/format";
import {
  priceRange,
  sortVariants,
  productImage,
  totalStock,
  type CatalogueProduct,
} from "@/lib/queries";
import { localized } from "@/lib/i18n";
import { saleOf } from "@/lib/sale";
import { StarRating } from "./star-rating";

/**
 * Catalogue card.
 *
 * Full-bleed 1:1 media, then a deliberately small text block: title, rating,
 * price, colour count and the gold "order now". The photograph sells; the only
 * gold on the card is the ordering action, which opens the product page where
 * the express form is.
 *
 * No category line: the shop has one category ("best sellers"), so the label
 * only repeated itself on every card. The title gets two lines' height and the
 * colour line always takes its row, so prices line up across a row.
 */
function ProductCard({ product, cta }: { product: CatalogueProduct; cta: GridCta }) {
  const { t, locale } = useI18n();

  const image = productImage(product);
  const range = priceRange(product);
  // The cheapest variant sets the headline price, so its sale is the one shown.
  const cheapest = sortVariants(product.product_variants).find((v) => v.price === range?.min);
  const sale = cheapest ? saleOf(cheapest) : null;
  const stock = totalStock(product);
  const soldOut = stock <= 0;
  // Distinct colours, so a buyer scanning the grid sees that a case comes in
  // several colours. The card data carries names, not swatch codes.
  const colours = [...new Set(product.product_variants.map((v) => v.color_name).filter(Boolean))];
  const rating = product.rating_avg ?? null;
  const ratingCount = product.rating_count ?? 0;

  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="product-card">
      <div className="pc-media">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" />
        ) : (
          <ImageOff size={44} aria-hidden="true" />
        )}
        {soldOut ? <span className="pc-flag out">{t("store.outOfStock")}</span> : null}
      </div>

      <div className="pc-body">
        {/* dir="auto": a Latin name ("Anti-Choc Iphone Magsafe") inside the
            Arabic page otherwise loses letters where the two lines are cut. */}
        <h3 className="pc-title" dir="auto">
          {localized(locale, product.name, product.name_fr)}
        </h3>

        {rating !== null && ratingCount > 0 && (
          <span className="pc-rating">
            <StarRating value={rating} />
            <span className="rcount">({ratingCount})</span>
          </span>
        )}

        {range && (
          <span className="pc-price-row">
            <span className="pc-price" dir="ltr">
              {range.min === range.max
                ? formatDzd(range.min, locale)
                : `${t("store.from")} ${formatDzd(range.min, locale)}`}
            </span>
            {sale && (
              <>
                <span className="pc-price-old" dir="ltr">
                  {formatDzd(sale.was, locale)}
                </span>
                <span className="pc-price-save" dir="ltr">
                  −{sale.percent}%
                </span>
              </>
            )}
          </span>
        )}

        <span className="pc-colours">
          {colours.length > 1 ? t("express.colours", { count: colours.length }) : null}
        </span>

        <span className="pc-cta">
          <span className="btn btn-secondary btn-sm btn-block !min-h-10">
            {soldOut
              ? t("store.outOfStock")
              : t(cta === "view" ? "store.viewDetails" : "express.cta")}
          </span>
        </span>
      </div>
    </Link>
  );
}

/** What a card's button says: "order now", or "details" where a page already has its own order form. */
type GridCta = "order" | "view";

export function ProductGrid({
  products,
  cta = "order",
}: {
  products: CatalogueProduct[];
  cta?: GridCta;
}) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} cta={cta} />
      ))}
    </div>
  );
}
