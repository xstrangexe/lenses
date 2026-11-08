import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useStoreSettings } from "@/lib/queries";
import { waLink } from "@/lib/whatsapp";

/** Section opener: small orange eyebrow, big uppercase title, optional "see all" link. */
export function SovaHead({
  eyebrow,
  title,
  to,
  toLabel,
}: {
  eyebrow: string;
  title: string;
  to?: "/catalogue";
  toLabel?: string;
}) {
  return (
    <div className="sova-head">
      <div>
        <p className="sova-eyebrow">{eyebrow}</p>
        <h2 className="sova-h2">{title}</h2>
      </div>
      {to && toLabel ? (
        <Link to={to} className="sova-more">
          {toLabel} <ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

/** Scrolling line above the header, the first thing on every storefront page. */
export function SovaTicker() {
  const { t } = useI18n();
  const items = [1, 2, 3, 4].map((n) => t(`sova.ticker.${n}` as "sova.ticker.1"));
  // Two copies side by side: the track slides by exactly one copy, so it loops.
  const run = (key: string) => (
    <ul className="sova-ticker-run" aria-hidden={key === "b"} key={key}>
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
  return (
    <div className="sova-ticker" role="marquee" aria-label={items.join(", ")}>
      <div className="sova-ticker-track">
        {run("a")}
        {run("b")}
        {run("c")}
        {run("d")}
      </div>
    </div>
  );
}

/** Four numbered promises under the hero. */
export function SovaTrustStrip({ wilayaCount }: { wilayaCount: number | null }) {
  const { t } = useI18n();
  // Only the wilaya count the shop's own delivery list gives; no number when unset.
  const labels = [
    t("sova.trust.1"),
    t("sova.trust.2"),
    t("sova.trust.3"),
    wilayaCount ? t("sova.trust.4", { n: String(wilayaCount) }) : t("sova.trust.4b"),
  ];
  return (
    <ul className="sova-strip container-page">
      {labels.map((label, i) => (
        <li key={label}>
          <span className="sova-strip-n">0{i + 1}</span>
          <b>{label}</b>
        </li>
      ))}
    </ul>
  );
}

/** Three big shortcuts: shop, track, care guide. */
export function SovaQuickAccess() {
  const { t } = useI18n();
  return (
    <section className="container-page sova-section">
      <p className="sova-eyebrow">{t("sova.quick.eyebrow")}</p>
      <div className="sova-quick">
        <Link to="/catalogue" className="sova-quick-card">
          <b>{t("sova.quick.shop")}</b>
          <span>{t("sova.quick.shopBody")}</span>
          <ArrowUpRight size={20} className="rtl:-scale-x-100" aria-hidden="true" />
        </Link>
        <Link to="/track" className="sova-quick-card">
          <b>{t("sova.quick.track")}</b>
          <span>{t("sova.quick.trackBody")}</span>
          <ArrowUpRight size={20} className="rtl:-scale-x-100" aria-hidden="true" />
        </Link>
        <a href="#care" className="sova-quick-card">
          <b>{t("sova.quick.guide")}</b>
          <span>{t("sova.quick.guideBody")}</span>
          <ArrowUpRight size={20} className="rtl:-scale-x-100" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/** The manifesto: three numbered beliefs on a raised band. */
export function SovaManifesto() {
  const { t } = useI18n();
  return (
    <section className="sova-band">
      <div className="container-page sova-section">
        <SovaHead eyebrow={t("sova.manifesto.eyebrow")} title={t("sova.manifesto.title")} />
        <ol className="sova-manifesto">
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <span className="sova-strip-n">0{n}</span>
              <h3>{t(`sova.manifesto.${n}t` as "sova.manifesto.1t")}</h3>
              <p>{t(`sova.manifesto.${n}b` as "sova.manifesto.1b")}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The house story: photo on one side, copy on the other. */
export function SovaStory() {
  const { t } = useI18n();
  return (
    <section className="container-page sova-section sova-story">
      <img src="/home/hero-eyes.jpg" alt="" loading="lazy" className="sova-story-img" />
      <div>
        <p className="sova-eyebrow">{t("sova.story.eyebrow")}</p>
        <h2 className="sova-h2">{t("sova.story.title")}</h2>
        <p className="sova-p">{t("sova.story.p1")}</p>
        <p className="sova-p">{t("sova.story.p2")}</p>
        <Link to="/catalogue" className="sova-btn sova-btn-ghost">
          {t("sova.story.cta")}
        </Link>
      </div>
    </section>
  );
}

/** White block closing the page: resellers contact the shop on WhatsApp. */
export function SovaReseller() {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const href = waLink(settings?.whatsapp) ?? "/track";
  return (
    <section className="sova-reseller">
      <div className="container-page sova-section">
        <p className="sova-eyebrow">{t("sova.reseller.eyebrow")}</p>
        <h2 className="sova-h2 sova-reseller-title">{t("sova.reseller.title")}</h2>
        <p className="sova-p">{t("sova.reseller.body")}</p>
        <a href={href} className="sova-btn">
          {t("sova.reseller.cta")}
        </a>
      </div>
    </section>
  );
}
