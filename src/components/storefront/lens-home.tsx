import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { localized } from "@/lib/i18n";
import type { CategoryWithCount } from "@/lib/queries";
import { SovaHead } from "./sova-home";

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
        <p className="sova-eyebrow">{t("sova.hero.eyebrow")}</p>
        <h1 className="sova-hero-h1" aria-label={t("lens.hero.title")}>
          <span>{t("sova.hero.l1")}</span>
          <span className="sova-outline">{t("sova.hero.l2")}</span>
        </h1>
        <p className="noir-lede">{t("lens.hero.body")}</p>
        <div className="sova-hero-cta">
          <a href={hasBrands ? "#brands" : "#catalogue"} className="noir-btn">
            {t("sova.hero.shop")}
          </a>
          <Link to="/track" className="noir-btn-ghost px-6">
            {t("sova.hero.track")}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** One tile per brand that has published lenses; hidden below two brands. */
export function BrandRow({ brands }: { brands: CategoryWithCount[] }) {
  const { t, locale } = useI18n();
  if (brands.length < 2) return null;
  return (
    <section id="brands" className="container-page sova-section scroll-mt-20">
      <SovaHead eyebrow={t("sova.brands.eyebrow")} title={t("sova.brands.title")} />
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
