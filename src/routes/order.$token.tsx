import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MapPin, MessageCircle, Package, Phone, Truck } from "lucide-react";
import { StoreLayout } from "@/components/storefront/store-layout";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { translate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { formatDateTime, formatDzd } from "@/lib/format";
import { isTerminal, orderNumber, trackOrder, type TrackedOrder } from "@/lib/order";
import { useStoreSettings } from "@/lib/queries";
import { waLink } from "@/lib/whatsapp";
import { isReviewable } from "@/lib/order-review";
import { wilayaLabel } from "@/lib/wilayas";
import { Timeline } from "@/components/storefront/order-timeline";
import { OrderThankYou } from "@/components/storefront/order-thank-you";

export const Route = createFileRoute("/order/$token")({
  // `?placed=1` is set only by the express order form, right after the database
  // accepted the order, so the success header never shows for a failed write.
  validateSearch: (search: Record<string, unknown>): { placed?: boolean } =>
    search.placed === true || search.placed === "1" || search.placed === 1 ? { placed: true } : {},
  head: ({ match }) => ({
    meta: [
      { title: translate(match.context.locale, "order.title") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { token } = Route.useParams();
  const { placed } = Route.useSearch();
  const { t, locale } = useI18n();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["track", token],
    queryFn: () => trackOrder(token),
    retry: false,
  });

  // Right after ordering: the thank-you page alone, with the full tracking view
  // one tap away (the same address without `?placed`).
  if (placed && data?.status === "pending") return <ThankYouView order={data} />;

  return (
    <StoreLayout>
      <div className="noir" data-theme="dark">
        <div className="container-page flex max-w-3xl flex-col gap-6 py-8 sm:py-12">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("order.title")}</h1>

          {isPending ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : !data ? (
            <EmptyState
              title={t("order.notFound")}
              action={
                <Button asChild variant="outline">
                  <Link to="/track">{t("order.lookupTitle")}</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-outline bg-surface p-5">
                <div>
                  <p className="text-xs text-on-surface-muted">{t("order.tokenLabel")}</p>
                  <p className="font-mono text-lg font-bold" dir="ltr">
                    {orderNumber(data.token)}
                  </p>
                </div>
                <StatusBadge status={data.status} />
              </div>

              {data.status === "pending" && (
                <p className="rounded-[16px] border border-tertiary/40 bg-tertiary/5 px-5 py-4 text-sm">
                  {t("order.confirmNote")}
                </p>
              )}

              {isStopped(data.status) ? (
                <StoppedNote number={orderNumber(data.token)} />
              ) : (
                <Timeline status={data.status} />
              )}

              <ReviewLink token={data.token} status={data.status} />

              <section className="flex flex-col gap-3 rounded-[16px] border border-outline bg-surface p-5">
                <h2 className="flex items-center gap-2 font-medium">
                  <Package size={16} className="text-primary" aria-hidden="true" />
                  {t("order.items")}
                </h2>
                <ul className="flex flex-col gap-3">
                  {data.items.map((item, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 text-sm">
                      <span>
                        <span className="block">{item.product_name}</span>
                        <span className="text-xs text-on-surface-muted">
                          {item.variant_label} × {item.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs" dir="ltr">
                        {formatDzd(item.unit_price * item.quantity, locale)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="flex flex-col gap-2 border-t border-outline pt-3 text-sm">
                  <Row label={t("cart.subtotal")} value={formatDzd(data.subtotal, locale)} />
                  <Row label={t("cart.delivery")} value={formatDzd(data.delivery_fee, locale)} />
                  <div className="flex justify-between border-t border-outline pt-2 font-semibold">
                    <dt>{t("common.total")}</dt>
                    <dd className="font-mono text-primary" dir="ltr">
                      {formatDzd(data.total, locale)}
                    </dd>
                  </div>
                </dl>
              </section>

              <Recipient order={data} />
            </>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}

/** Refused, cancelled or returned: the flow stopped, so no timeline that looks in progress. */
function isStopped(status: string): boolean {
  return isTerminal(status) && status !== "delivered";
}

function StoppedNote({ number }: { number: string }) {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const whatsapp = waLink(settings?.whatsapp, t("placed.waText", { number }));
  return (
    <section className="ty-card ty-stopped">
      <h2 className="ty-card-title">{t("order.stoppedTitle")}</h2>
      <p className="text-sm text-on-surface-muted">{t("order.stoppedBody")}</p>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-block"
        >
          <MessageCircle size={18} aria-hidden="true" />
          {t("placed.whatsapp")}
        </a>
      )}
    </section>
  );
}

/** Who and where the parcel goes, and the carrier once it ships. */
function Recipient({ order }: { order: TrackedOrder }) {
  const { t, locale } = useI18n();
  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-outline bg-surface p-5 text-sm">
      <h2 className="flex items-center gap-2 font-medium">
        <MapPin size={16} className="text-primary" aria-hidden="true" />
        {t("order.customer")}
      </h2>
      <p>{order.customer_name}</p>
      <p className="flex items-center gap-2 text-on-surface-muted">
        <Phone size={14} aria-hidden="true" />
        <span dir="ltr" className="font-mono text-xs">
          {order.phone}
        </span>
      </p>
      <p className="text-on-surface-muted">
        {wilayaLabel(order.wilaya, locale)}
        {order.commune ? ` — ${order.commune}` : ""}
      </p>
      <p className="text-on-surface-muted">{order.address}</p>
      {order.delivery_method === "stopdesk" && (
        <p className="mt-1 font-medium">
          {t("checkout.method.stopdesk")}
          {order.stopdesk_name ? `: ${order.stopdesk_name}` : ""}
        </p>
      )}
      {(order.carrier || order.tracking_number) && (
        <p className="flex items-center gap-2 text-on-surface-muted">
          <Truck size={14} aria-hidden="true" />
          {[order.carrier, order.tracking_number].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="text-xs text-on-surface-muted">{formatDateTime(order.created_at, locale)}</p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-on-surface-muted">{label}</dt>
      <dd className="font-mono" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

/** Once the parcel is delivered, a quiet way to the review page. */
function ReviewLink({ token, status }: { token: string; status: string }) {
  const { t } = useI18n();
  if (!isReviewable(status)) return null;
  return (
    <Link
      to="/review/$token"
      params={{ token }}
      className="min-h-11 text-center text-sm font-semibold text-gold-ink underline underline-offset-4"
    >
      {t("order.reviewLink")}
    </Link>
  );
}

function ThankYouView({ order }: { order: TrackedOrder }) {
  const { t } = useI18n();
  return (
    <StoreLayout>
      <div className="noir" data-theme="dark">
        <div className="container-page flex max-w-xl flex-col gap-5 py-6 sm:py-10">
          <OrderThankYou order={order} />
          <Link
            to="/order/$token"
            params={{ token: order.token }}
            className="min-h-11 text-center text-sm font-semibold text-gold-ink underline underline-offset-4"
          >
            {t("placed.track")}
          </Link>
        </div>
      </div>
    </StoreLayout>
  );
}
