import { Link } from "@tanstack/react-router";
import { ArrowLeft, Banknote, RefreshCw, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { localized } from "@/lib/i18n";
import type { CategoryWithCount } from "@/lib/queries";

/**
 * Home page, "Noir & Gold": a black stage, champagne gold for actions and
 * accents only, cream for reading. The catalogue's own eye photography is the
 * hero; the brands sit directly under it so a visitor from an ad sees the
 * choice on the first phone screen.
 */
export function LensHero({ hasBrands }: { hasBrands: boolean }) {
  const { t } = useI18n();
  return (
    <section className="noir-hero">
      <img
        src="/home/hero-eyes.jpg"
        alt={t("lens.hero.alt")}
        className="noir-hero-img"
        fetchPriority="high"
      />
      <div className="noir-hero-shade" aria-hidden="true" />
      <div className="container-page noir-hero-copy">
        <h1 className="font-display noir-h1">{t("lens.hero.title")}</h1>
        <p className="noir-lede">{t("lens.hero.body")}</p>
        <a href={hasBrands ? "#brands" : "#catalogue"} className="noir-btn">
          {t(hasBrands ? "lens.hero.cta" : "lens.hero.ctaLenses")}
        </a>
      </div>
    </section>
  );
}

/** One tile per brand that has published lenses; hidden below two brands. */
export function BrandRow({ brands }: { brands: CategoryWithCount[] }) {
  const { t, locale } = useI18n();
  if (brands.length < 2) return null;
  return (
    <section id="brands" className="container-page scroll-mt-20 py-10 sm:py-14">
      <h2 className="font-display noir-h2">{t("lens.brands.title")}</h2>
      <ul className="noir-brands">
        {brands.map((b) => (
          <li key={b.id}>
            <Link to="/category/$slug" params={{ slug: b.slug }} className="noir-brand">
              {b.image_url ? (
                <img src={b.image_url} alt="" loading="lazy" className="noir-brand-img" />
              ) : (
                <span className="noir-brand-mono font-display" aria-hidden="true">
                  {localized(locale, b.name, b.name_fr).charAt(0)}
                </span>
              )}
              <span className="noir-brand-name font-display">
                {localized(locale, b.name, b.name_fr)}
              </span>
              <span className="noir-brand-count">
                {t("lens.brands.count", { n: String(b.product_count) })}
              </span>
              <ArrowLeft size={16} className="noir-brand-arrow ltr:rotate-180" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The three promises, said once, as a quiet line under the brands. */
export function NoirTrust({
  returnsDays,
  wilayaCount,
}: {
  returnsDays: number;
  wilayaCount: number | null;
}) {
  const { t } = useI18n();
  const items = [
    { Icon: Banknote, title: t("home2.trust.cod"), body: t("home2.trust.codBody") },
    {
      Icon: Truck,
      title: t("lens.trust.delivery", { n: String(wilayaCount ?? 58) }),
      body: t("home2.trust.deliveryBody"),
    },
    {
      Icon: RefreshCw,
      title: t("home2.trust.exchange"),
      body: t("home2.trust.exchangeBody", { days: String(returnsDays) }),
    },
  ];
  return (
    <section className="container-page">
      <ul className="noir-trust">
        {items.map(({ Icon, title, body }) => (
          <li key={title}>
            <Icon size={20} className="noir-gold" aria-hidden="true" />
            <span>
              <b>{title}</b>
              <small>{body}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
