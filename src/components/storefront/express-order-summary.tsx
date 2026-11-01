import { Loader2, Lock, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { formatDzd } from "@/lib/format";
import { QuantityStepper } from "./express-order-fields";

/**
 * The money part of the express order form: the case being ordered (photo,
 * name, model, quantity), what it costs with delivery, and the one button that
 * places it. The total is the amount the courier collects, so it is the largest
 * number on the form, in gold.
 *
 * The figures are a preview. `place_order()` recomputes price and delivery fee
 * from the database, and the confirmation page shows the stored amounts.
 */
export function ExpressOrderSummary({
  productName,
  variantLabel,
  image,
  quantity,
  maxQuantity,
  onQuantity,
  unitPrice,
  deliveryFee,
  error,
  submitting,
}: {
  productName: string;
  variantLabel: string | null;
  image: string | null;
  quantity: number;
  maxQuantity: number;
  onQuantity: (quantity: number) => void;
  unitPrice: number;
  /** Null until a wilaya is chosen. */
  deliveryFee: number | null;
  error: string | null;
  submitting: boolean;
}) {
  const { t, locale } = useI18n();
  const subtotal = unitPrice * quantity;
  const total = subtotal + (deliveryFee ?? 0);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="xo-summary">
        <h3 className="xo-summary-title">{t("express.summary")}</h3>
        <div className="xo-item">
          {image && <img src={image} alt="" width={56} height={56} decoding="async" />}
          {/* A 7.5rem floor: on a 320px phone the stepper drops under the name
              instead of squeezing it until "BURGUNDY" is cut. */}
          <span className="min-w-0 flex-[1_1_7.5rem]">
            {/* dir="auto": a Latin name inside the Arabic line kept jumping
                around the "× 1" next to it. */}
            <span className="xo-item-name" dir="auto">
              {productName}
            </span>
            {variantLabel && (
              <span className="xo-item-variant" dir="auto">
                {variantLabel}
              </span>
            )}
          </span>
          <QuantityStepper quantity={quantity} max={maxQuantity} onChange={onQuantity} />
        </div>

        <dl className="xo-lines">
          <div>
            <dt>
              {t("express.subtotal")}
              {quantity > 1 && (
                <span className="xo-mult" dir="ltr">
                  ×{quantity}
                </span>
              )}
            </dt>
            <dd dir="ltr">{formatDzd(subtotal, locale)}</dd>
          </div>
          <div>
            <dt>{t("express.delivery")}</dt>
            <dd
              dir={deliveryFee === null ? undefined : "ltr"}
              className={deliveryFee === null ? "is-pending" : ""}
            >
              {deliveryFee === null ? t("express.deliveryPending") : formatDzd(deliveryFee, locale)}
            </dd>
          </div>
          <div className="xo-total">
            <dt>{t("express.total")}</dt>
            {/* Keyed by the amount so the figure pops each time it changes. */}
            {/* Before a wilaya is picked the delivery fee is unknown, so the
                figure says "+ delivery" instead of passing for the final amount. */}
            <dd key={total} className={deliveryFee === null ? "is-partial" : ""}>
              <span dir="ltr">{formatDzd(total, locale)}</span>
              {deliveryFee === null && <span className="xo-plus">{t("express.plusDelivery")}</span>}
            </dd>
          </div>
        </dl>
      </div>

      {error && (
        <p className="xo-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="xo-cta" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            {t("express.submitting")}
          </>
        ) : (
          t("express.submit")
        )}
      </button>

      <p className="xo-delivery">
        <Truck size={15} aria-hidden="true" />
        {t("express.deliveryNote")}
      </p>

      <p className="xo-privacy">
        <Lock size={12} aria-hidden="true" />
        {t("express.privacy")}
      </p>
    </div>
  );
}
