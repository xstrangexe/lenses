import { Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { infoPages } from "@/lib/pages";
import { useI18n } from "@/lib/i18n-context";
import { deliveryWilayaCount, useStoreSettings } from "@/lib/queries";
import { SocialLinks } from "./social-links";
import { waLink } from "@/lib/whatsapp";

/**
 * Storefront footer.
 *
 * This is not decoration. Algerian law 18-05 (article 11) and law 18-07 require
 * a commercial site to publish the trader's identity, contact details, delivery
 * terms and return policy. The fields come from `store_settings`, and any row the
 * owner has not filled in is omitted rather than rendered as an empty label —
 * an address line reading "NIF:" with nothing after it is worse than no line.
 */
export function SiteFooter() {
  const { t, locale } = useI18n();
  const { data: settings } = useStoreSettings();
  const wilayaCount = deliveryWilayaCount(settings);

  // Owner text is shown in the buyer's language when a Latin version exists.
  // Arabic-only text is left out for French and English readers rather than
  // shown untranslated; the address falls back, since it is still an address.
  const ownText = (arabic: string | null | undefined, latin: string | null | undefined) =>
    locale === "ar" ? arabic : latin;
  // The tagline only: the description is already the hero's first paragraph.
  const tagline = ownText(settings?.tagline, settings?.tagline_fr);
  const address = locale === "ar" ? settings?.address : (settings?.address_fr ?? settings?.address);
  const identity = [settings?.legal_name, address].filter(Boolean) as string[];
  const tax = [
    settings?.nif ? { label: "NIF", value: settings.nif } : null,
    settings?.rc_number ? { label: "RC", value: settings.rc_number } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  // A legal block holding only the country repeats the contact column; it shows
  // once there is a trader name or a tax number to publish.
  const hasLegal = Boolean(settings?.legal_name) || tax.length > 0;

  // Normalised, because an owner types the number the local way and wa.me needs
  // the international form. Null when there is no usable number, so the row is
  // omitted rather than rendered as a link that goes nowhere.
  const whatsappHref = waLink(settings?.whatsapp);

  return (
    <footer className="mt-6 border-t border-outline bg-section-alt sm:mt-12">
      <div className="container-page grid gap-6 py-8 sm:grid-cols-2 sm:gap-8 sm:py-10 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-lg font-semibold">{settings?.name ?? t("app.name")}</p>
          {tagline && <p className="text-sm text-on-surface-muted">{tagline}</p>}
        </div>

        {hasLegal && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
              {t("admin.settings.legal")}
            </p>
            {identity.map((line) => (
              <p key={line} className="text-sm text-on-surface-muted">
                {line}
              </p>
            ))}
            {tax.map((item) => (
              <p key={item.label} className="font-mono text-xs text-on-surface-muted">
                {item.label} {item.value}
              </p>
            ))}
          </div>
        )}

        <FooterPages />

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("footer.contact")}</p>
          {settings?.phone && (
            <a
              href={`tel:${settings.phone.replace(/\s/g, "")}`}
              className="flex min-h-11 items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface"
            >
              <Phone size={15} aria-hidden="true" />
              <span dir="ltr">{settings.phone}</span>
            </a>
          )}
          {/* Named, not numbered: it is usually the same number as the phone,
              and printing it twice read as a mistake. */}
          {whatsappHref && (
            <a
              href={whatsappHref}
              className="flex min-h-11 items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface"
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageCircle size={15} aria-hidden="true" />
              {t("store.orderViaWhatsapp")}
            </a>
          )}
          {settings?.email && (
            <a
              href={`mailto:${settings.email}`}
              className="flex min-h-11 items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface"
            >
              <Mail size={15} aria-hidden="true" />
              <span>{settings.email}</span>
            </a>
          )}
          {address && (
            <span className="flex items-center gap-2 text-sm text-on-surface-muted">
              <MapPin size={15} aria-hidden="true" />
              {address}
            </span>
          )}
          <SocialLinks settings={settings} />
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center justify-between gap-3 border-t border-outline py-5 text-xs text-on-surface-muted">
        {/* Delivery is priced per wilaya (shown at checkout), so no single fee here. */}
        <p>
          {[
            t("checkout.codTitle"),
            wilayaCount === null ? null : t("trust2.wilayas", { count: wilayaCount }),
            t("home.trust.returns.title", { days: settings?.returns_days ?? 7 }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {settings?.returns_note && (
        <div className="container-page pb-6">
          <p className="text-xs text-on-surface-muted">{settings.returns_note}</p>
        </div>
      )}
    </footer>
  );
}

/** The info pages, two columns on a phone: one per row took a whole screen. */
function FooterPages() {
  const { t } = useI18n();
  return (
    <nav aria-label={t("footer.pages")}>
      <p className="mb-1 text-sm font-medium">{t("footer.pages")}</p>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-1">
        {infoPages().map((page) => (
          <Link
            key={page.slug}
            to="/pages/$slug"
            params={{ slug: page.slug }}
            className="flex min-h-10 items-center text-sm text-on-surface-muted hover:text-on-surface"
          >
            {page.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
