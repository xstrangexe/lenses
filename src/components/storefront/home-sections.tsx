import { Quote } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { formatRelative } from "@/lib/format";
import { useReviews } from "@/lib/queries";
import { StarRating } from "./star-rating";

/**
 * Promo band. Berry, per the reference's "sale/secondary action" colour, so it
 * reads as a time-limited offer rather than as another primary button.
 */
export function PromoBand({ threshold }: { threshold: number }) {
  const { t, locale } = useI18n();
  if (threshold <= 0) return null;

  const formatted = new Intl.NumberFormat("en-US").format(threshold);

  return (
    <section className="container-page py-6">
      <div className="promo-bar">
        <span className="p-text">
          {t("home.promo.title")} -{" "}
          <span dir="ltr" className="font-mono">
            {formatted}
          </span>{" "}
          {locale === "ar" ? "دج" : "DA"}
        </span>
        <span className="p-text opacity-90">{t("home.promo.body")}</span>
        <a href="#catalogue" className="promo-cta">
          {t("home.promo.cta")}
        </a>
      </div>
    </section>
  );
}

/** Review wall, from the store's own approved reviews. */
export function ReviewWall() {
  const { t, locale } = useI18n();
  const { data: reviews } = useReviews();
  const top = (reviews ?? []).slice(0, 3);

  if (top.length === 0) return null;

  return (
    <section className="section-alt border-y border-outline py-14">
      <div className="container-page">
        <div className="mb-8 flex flex-col items-center text-center">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {t("home.reviews.title")}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-on-surface-muted">{t("home.reviews.body")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {top.map((review) => (
            <figure key={review.id} className="review-card">
              {review.image_url ? (
                <img
                  src={review.image_url}
                  alt=""
                  loading="lazy"
                  className="mb-4 aspect-square w-full rounded-[14px] object-cover"
                />
              ) : (
                <Quote size={18} className="mb-3 text-outline-hi" aria-hidden="true" />
              )}
              <StarRating value={review.rating} className="mb-3" />
              <blockquote className="review-body">{review.comment}</blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5">
                <span className="review-ava" aria-hidden="true">
                  {review.customer_name.trim().charAt(0)}
                </span>
                <span>
                  <span className="block text-sm font-medium">{review.customer_name}</span>
                  <span className="text-xs text-on-surface-muted">
                    {formatRelative(review.created_at, locale)}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * "How to order": the four real steps of a SHOPORA order, from picking a model
 * to paying the courier. It answers the first-time buyer's real question
 * (do I pay now? do I need an account?) without inventing any promise.
 */
export function HowToOrder() {
  const { t } = useI18n();
  const steps = [
    ["how.step1.title", "how.step1.body"],
    ["how.step2.title", "how.step2.body"],
    ["how.step3.title", "how.step3.body"],
    ["how.step4.title", "how.step4.body"],
  ] as const;

  return (
    <section className="container-page py-8 sm:py-12" aria-labelledby="how-title">
      <h2 id="how-title" className="mb-4 font-display text-xl font-bold sm:text-2xl">
        {t("how.title")}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], index) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-[16px] border border-outline bg-surface p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-on-surface font-bold text-bg">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{t(title)}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-muted">
                {t(body)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
