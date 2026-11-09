import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Banknote, Building2, Check, Home, MessageCircle, PhoneCall, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { formatDzd } from "@/lib/format";
import { useStoreSettings } from "@/lib/queries";
import { waLink } from "@/lib/whatsapp";
import { wilayaLabel } from "@/lib/wilayas";
import { orderPhoto } from "@/lib/order-photo";
import { orderNumber, type TrackedOrder } from "@/lib/order";

/**
 * The page a buyer lands on right after ordering.
 *
 * Cash-on-delivery orders are lost after this moment, when the buyer is unsure
 * the order went through or does not pick up the confirmation call. So the page
 * says it plainly: their name, what they ordered, where it goes, the exact cash
 * to have ready, and the three steps ahead, starting with the call within 24
 * hours. WhatsApp is there for a buyer who wants to change something.
 */
export function OrderThankYou({ order }: { order: TrackedOrder }) {
  const { t } = useI18n();
  const number = orderNumber(order.token);
  const firstName = order.customer_name.trim().split(/\s+/)[0] ?? "";

  return (
    <section className="ty">
      <div className="ty-head">
        <span className="ty-check" aria-hidden="true">
          <Check size={40} strokeWidth={3} />
        </span>
        <h1 className="ty-title font-display">{t("placed.title", { name: firstName })}</h1>
        <p className="ty-call">{t("placed.call")}</p>
        <p className="ty-number">
          {t("placed.number")}:{" "}
          <span dir="ltr" className="font-mono font-bold">
            {number}
          </span>
        </p>
      </div>

      <Summary order={order} />
      <Steps phone={order.phone} />
      <Actions number={number} />
    </section>
  );
}

function Summary({ order }: { order: TrackedOrder }) {
  const { t, locale } = useI18n();
  // Read after mount: the server has no session storage, and the first client
  // render must match the server's.
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => setPhoto(orderPhoto(order.token)), [order.token]);
  const office = order.delivery_method === "stopdesk";
  const place = [wilayaLabel(order.wilaya, locale), order.commune].filter(Boolean).join(" — ");

  return (
    <div className="ty-card">
      <h2 className="ty-card-title">{t("placed.summary")}</h2>
      <ul className="ty-items">
        {order.items.map((item, index) => (
          <li key={index} className="ty-item">
            {photo && index === 0 ? (
              <img src={photo} alt="" className="ty-photo" />
            ) : (
              <span className="ty-photo ty-photo-empty" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold" dir="auto">
                {item.product_name}
              </span>
              <span className="block text-sm text-on-surface-muted" dir="auto">
                {item.variant_label} × {item.quantity}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="ty-where">
        {office ? (
          <Building2 size={18} aria-hidden="true" />
        ) : (
          <Home size={18} aria-hidden="true" />
        )}
        <span>
          <span className="block font-semibold">
            {office ? t("placed.office") : t("placed.home")}
            {office && order.stopdesk_name ? `: ${order.stopdesk_name}` : ""}
          </span>
          <span className="block text-sm text-on-surface-muted">{place}</span>
        </span>
      </p>

      <div className="ty-cash">
        <span>{t("placed.cash")}</span>
        <strong dir="ltr">{formatDzd(order.total, locale)}</strong>
      </div>
    </div>
  );
}

function Steps({ phone }: { phone: string }) {
  const { t } = useI18n();
  const steps = [
    { icon: PhoneCall, title: t("placed.step1"), note: t("placed.step1b", { phone }) },
    { icon: Truck, title: t("placed.step2"), note: t("placed.step2b") },
    { icon: Banknote, title: t("placed.step3"), note: t("placed.step3b") },
  ];

  return (
    <div className="ty-card">
      <h2 className="ty-card-title">{t("placed.next")}</h2>
      <ol className="ty-steps">
        {steps.map((step, index) => (
          <li key={index} className="ty-step">
            <span className="ty-step-icon" aria-hidden="true">
              <step.icon size={18} />
            </span>
            <span>
              <span className="block font-semibold">{step.title}</span>
              <span className="block text-sm text-on-surface-muted" dir="auto">
                {step.note}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Actions({ number }: { number: string }) {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const whatsapp = waLink(settings?.whatsapp, t("placed.waText", { number }));

  return (
    <div className="flex flex-col gap-3">
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-lg btn-block"
        >
          <MessageCircle size={18} aria-hidden="true" />
          {t("placed.whatsapp")}
        </a>
      )}
      <Link to="/" className="btn btn-primary btn-lg btn-block">
        {t("placed.continue")}
      </Link>
      <p className="text-center text-xs text-on-surface-muted">{t("placed.keep")}</p>
    </div>
  );
}
