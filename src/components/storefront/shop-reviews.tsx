import { useI18n } from "@/lib/i18n-context";
import { useReviews } from "@/lib/queries";
import { ReviewItem } from "./reviews";

/**
 * For a product nobody has reviewed yet: what the shop's other buyers said, so
 * a cautious visitor still sees that real people have received orders. The
 * block says plainly that these are about other products; it never counts or
 * rates anything itself. Reviews with a photo come first, and nothing shows
 * until the shop has approved at least one review anywhere.
 */
export function ShopReviews() {
  const { t } = useI18n();
  const { data: reviews } = useReviews();
  const shown = [...(reviews ?? [])]
    .sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
    .slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="shop-reviews-title">
      <div className="flex flex-col gap-1">
        <h2 id="shop-reviews-title" className="font-display text-xl font-semibold">
          {t("reviews.shopTitle")}
        </h2>
        <p className="text-sm text-on-surface-muted">{t("reviews.shopBody")}</p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {shown.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
    </section>
  );
}
