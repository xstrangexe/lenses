import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, MapPin, Search, Truck } from "lucide-react";
import { StoreLayout } from "@/components/storefront/store-layout";
import { Timeline } from "@/components/storefront/order-timeline";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { formatDzd } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { isTokenShaped } from "@/lib/order";
import {
  lookupOrdersByPhone,
  normalisePhone,
  type LookedUpOrder,
  type PhoneLookupResult,
} from "@/lib/order-lookup";
import { wilayaLabel } from "@/lib/wilayas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  head: ({ match }) => ({ meta: [{ title: translate(match.context.locale, "order.title") }] }),
  component: TrackPage,
});

/**
 * Order lookup by the phone number used at checkout.
 *
 * The number is checked and normalised here first, so a typo never costs a
 * database call (the database limits how often a number can be tried). The
 * answer is a masked name, the wilaya, status, products and total, and never the
 * address or the order's own link. Buyers who only have an order number can
 * still use it, below the form.
 */
function TrackPage() {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [result, setResult] = useState<PhoneLookupResult | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!normalisePhone(phone)) {
      setPhoneError(t("track.phoneInvalid"));
      setResult(null);
      return;
    }
    setPhoneError(null);
    setBusy(true);
    setResult(await lookupOrdersByPhone(phone));
    setBusy(false);
  };

  return (
    <StoreLayout>
      <div className="container-page flex max-w-xl flex-col gap-6 py-10 sm:py-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t("track.title")}</h1>
          <p className="text-sm text-on-surface-muted">{t("track.body")}</p>
        </div>

        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
          <Field label={t("track.phoneLabel")} error={phoneError}>
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
              className="font-mono"
              placeholder="05 55 12 34 56"
              autoComplete="tel"
              maxLength={24}
            />
          </Field>
          <Button type="submit" size="lg" className="self-start" disabled={busy}>
            <Search size={18} aria-hidden="true" />
            {busy ? t("track.searching") : t("track.search")}
          </Button>
        </form>

        <div aria-live="polite" className="flex flex-col gap-4">
          {result && <LookupResult result={result} />}
        </div>

        <TokenLookup />
      </div>
    </StoreLayout>
  );
}

function LookupResult({ result }: { result: PhoneLookupResult }) {
  const { t } = useI18n();

  if (!result.ok) {
    if (result.code === "invalid_phone") return <Notice>{t("track.phoneInvalid")}</Notice>;
    if (result.code === "rate_limited") {
      return (
        <Notice>{t("track.rateLimited", { minutes: Math.ceil(result.retryAfter / 60) })}</Notice>
      );
    }
    return <Notice>{t("track.failed")}</Notice>;
  }

  if (result.orders.length === 0) return <Notice>{t("track.noOrders")}</Notice>;

  return (
    <>
      <h2 className="font-medium">{t("track.found", { count: result.orders.length })}</h2>
      <ul className="flex flex-col gap-3">
        {result.orders.map((order, index) => (
          <OrderCard
            key={`${order.created_at}-${index}`}
            order={order}
            startOpen={result.orders.length === 1}
          />
        ))}
      </ul>
      <p className="text-xs text-on-surface-muted">{t("track.privacy")}</p>
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-[16px] border border-outline bg-surface px-5 py-4 text-sm">
      {children}
    </p>
  );
}

function OrderCard({ order, startOpen }: { order: LookedUpOrder; startOpen: boolean }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(startOpen);
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(order.created_at));
  const products = order.items.map((item) => item.product_name).join("، ");

  return (
    <li className="rounded-[16px] border border-outline bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full flex-col gap-2 p-5 text-start"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("track.orderFrom", { date })}</span>
          <StatusBadge status={order.status} />
        </span>
        <span className="line-clamp-2 text-sm text-on-surface-muted">{products}</span>
        <span className="flex items-center justify-between gap-3 text-sm">
          <span className="font-mono font-semibold text-primary" dir="ltr">
            {formatDzd(order.total, locale)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gold-ink">
            {open ? t("track.hideDetails") : t("track.showDetails")}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </span>
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-outline p-5">
          <Timeline status={order.status} />

          <ul className="flex flex-col gap-3">
            {order.items.map((item, index) => (
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

          <div className="flex flex-col gap-1 text-sm text-on-surface-muted">
            <p className="flex items-center gap-2">
              <MapPin size={14} aria-hidden="true" />
              {t("track.recipient")}: <bdi>{order.name}</bdi> — {wilayaLabel(order.wilaya, locale)}
            </p>
            {(order.carrier || order.tracking_number) && (
              <p className="flex items-center gap-2">
                <Truck size={14} aria-hidden="true" />
                <span dir="ltr">
                  {[order.carrier, order.tracking_number].filter(Boolean).join(" · ")}
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** The older way in: an order number (the one in the order link). */
function TokenLookup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = token.trim();
    if (!isTokenShaped(trimmed)) {
      setError(t("order.notFound"));
      return;
    }
    setError(null);
    void navigate({ to: "/order/$token", params: { token: trimmed } });
  };

  return (
    <details className="border-t border-outline pt-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm text-on-surface-muted">
        {t("track.haveNumber")}
      </summary>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-4">
        <Field label={t("order.tokenLabel")} error={error}>
          <Input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            dir="ltr"
            className="font-mono"
            placeholder="00000000-0000-0000-0000-000000000000"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Button type="submit" variant="outline" className="self-start">
          <Search size={18} aria-hidden="true" />
          {t("order.lookup")}
        </Button>
      </form>
    </details>
  );
}
