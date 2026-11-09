import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { formatDzd } from "@/lib/format";
import { localized } from "@/lib/i18n";
import {
  priceRange,
  productImage,
  type CatalogueProduct,
  type CategoryWithCount,
} from "@/lib/queries";
import { ProductCard } from "./product-card";

type Tile =
  | { kind: "product"; product: CatalogueProduct }
  | { kind: "brand"; category: CategoryWithCount; products: CatalogueProduct[] };

/**
 * Home grid tiles, one per brand: a brand with a single product shows that
 * product; a brand sold as one product per colour (FreshLady) shows one
 * collection card that opens its brand page, where the colours are. Brands
 * keep the order of their newest product.
 */
export function homeTiles(products: CatalogueProduct[], categories: CategoryWithCount[]): Tile[] {
  const groups = new Map<string | null, CatalogueProduct[]>();
  for (const product of products) {
    const group = groups.get(product.category_id) ?? [];
    group.push(product);
    groups.set(product.category_id, group);
  }
  const tiles: Tile[] = [];
  for (const [categoryId, group] of groups) {
    const category = categories.find((c) => c.id === categoryId);
    if (group.length > 1 && category) tiles.push({ kind: "brand", category, products: group });
    else for (const product of group) tiles.push({ kind: "product", product });
  }
  return tiles;
}

export function HomeTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="product-grid">
      {tiles.map((tile) =>
        tile.kind === "product" ? (
          <ProductCard key={tile.product.id} product={tile.product} cta="order" />
        ) : (
          <BrandCard key={tile.category.id} category={tile.category} products={tile.products} />
        ),
      )}
    </div>
  );
}

/** One card for a whole colour collection, laid out like a product card. */
function BrandCard({
  category,
  products,
}: {
  category: CategoryWithCount;
  products: CatalogueProduct[];
}) {
  const { t, locale } = useI18n();
  // The brand's own collection picture when the owner set one, else its newest product's.
  const image = category.image_url || productImage(products[0]);
  const prices = products.map((p) => priceRange(p)?.min).filter((v): v is number => v != null);
  const from = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <Link to="/category/$slug" params={{ slug: category.slug }} className="product-card">
      <div className="pc-media">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" />
        ) : (
          <ImageOff size={44} aria-hidden="true" />
        )}
      </div>
      <div className="pc-body">
        <h3 className="pc-title" dir="auto">
          {localized(locale, category.name, category.name_fr)}
        </h3>
        {from !== null && (
          <span className="pc-price-row">
            <span className="pc-price" dir="ltr">
              {`${t("store.from")} ${formatDzd(from, locale)}`}
            </span>
          </span>
        )}
        <span className="pc-colours">{t("express.colours", { count: products.length })}</span>
        <span className="pc-cta">
          <span className="btn btn-secondary btn-sm btn-block !min-h-10">{t("brand.pickCta")}</span>
        </span>
      </div>
    </Link>
  );
}
