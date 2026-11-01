import { Banknote, RefreshCw, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { deliveryWilayaCount, useStoreSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Three facts the shop keeps, in one card: cash on delivery, how many wilayas in
 * 1 to 3 days (from the owner's delivery list) and the exchange window. Used
 * under the home hero and under the price on a product page, so a buyer sees
 * them where they decide, not only in the form below. Until the delivery list is
 * known the wilaya fact is left out rather than shown with a guessed number.
 */
export function TrustCard({
  returnsDays,
  wilayaCount,
}: {
  returnsDays?: number;
  wilayaCount?: number | null;
}) {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const days = returnsDays ?? settings?.returns_days ?? 7;
  const count = wilayaCount ?? deliveryWilayaCount(settings);
  const items = [
    { icon: Banknote, title: t("home2.trust.cod"), body: t("home2.trust.codBody") },
    count === null
      ? null
      : {
          icon: Truck,
          title: t("trust2.wilayas", { count }),
          body: t("home2.trust.deliveryBody"),
        },
    {
      icon: RefreshCw,
      title: t("home2.trust.exchange"),
      body: t("home2.trust.exchangeBody", { days }),
    },
  ].filter((item) => item !== null);

  return (
    <ul
      className={cn(
        "grid divide-x divide-outline overflow-hidden rounded-[18px] border border-outline bg-surface rtl:divide-x-reverse",
        items.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {items.map((item) => (
        <li key={item.title} className="flex flex-col items-center gap-1 px-2 py-3.5 text-center">
          <item.icon size={18} className="text-gold-ink" aria-hidden="true" />
          <span className="text-[13px] font-bold leading-tight sm:text-sm">{item.title}</span>
          <span className="text-xs leading-tight text-on-surface-muted">{item.body}</span>
        </li>
      ))}
    </ul>
  );
}
