import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n-context";
import type { StoreSettings } from "@/lib/queries";
import { HERO_SCALE_SCRIPT, applyHeroScale, enter } from "@/lib/hero-scale";
import { HeroRing } from "./hero-ring";
import { TrustCard } from "./trust-card";

/**
 * Home hero: a black stage under the black header, the delivery badge, the
 * tagline, the owner's description and a gold "shop now"; under them a 3D ring
 * of the shop's own phone-case pictures turning slowly, spaced and shown whole,
 * with nothing on top of it. Everything below stays cream.
 *
 * The owner's tagline and description are Arabic, so French and English readers
 * get the interface headline instead of untranslated text.
 */
export function HomeHero({ settings }: { settings: StoreSettings | null }) {
  const { t, locale } = useI18n();
  const section = useRef<HTMLElement>(null);
  const tagline =
    (locale === "ar" ? settings?.tagline?.trim() : settings?.tagline_fr?.trim()) ||
    t("home.hero.title");
  const description =
    locale === "ar" ? settings?.description?.trim() : settings?.description_fr?.trim();

  useEffect(() => {
    const el = section.current;
    const resize = () => applyHeroScale(el);
    resize();
    stars(el);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <section ref={section} className="hx" suppressHydrationWarning>
        <div className="hx-stars" data-n="150" data-blur="0" />
        <div className="hx-stars" data-n="18" data-blur="1.2" />
        <div className="hx-canvas" suppressHydrationWarning>
          <div className="hx-row" style={{ top: 40 }}>
            <span className="hx-badge hx-a" style={enter(270, 11, 0.985)}>
              <i aria-hidden="true">
                <svg viewBox="5 1 14 22" preserveAspectRatio="none">
                  <path
                    d="M13.9 1.6 5.5 13.6a.7.7 0 0 0 .6 1.1h4.2l-1 7.7a.7.7 0 0 0 1.25.55l8.3-12.1a.7.7 0 0 0-.6-1.1h-4.2l1-7.7a.7.7 0 0 0-1.25-.55Z"
                    fill="rgba(150,115,55,.72)"
                    stroke="rgba(255,236,190,.6)"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </i>
              {t("home2.pill")}
            </span>
          </div>
          <div className="hx-row" style={{ top: 94 }}>
            <h1 className="hx-h1 font-display">{tagline}</h1>
          </div>
          {description && (
            <div className="hx-row" style={{ top: 180 }}>
              <p className="hx-sub hx-a" style={enter(690, 10)}>
                {description}
              </p>
            </div>
          )}
          <div className="hx-row hx-cta" style={{ top: 262 }}>
            <a href="#catalogue" className="hx-btn hx-a" style={enter(830, 13, 0.985)}>
              <span>{t("home2.shop")}</span>
            </a>
          </div>
          <div className="hx-show">
            <HeroRing />
          </div>
        </div>
      </section>
      {/* Scales the canvas before the first paint, not after hydration. The
          server and browser bundles print the function differently, and the
          script has already run by hydration, so its text is not compared. */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HERO_SCALE_SCRIPT }} />
    </>
  );
}

/** Two starfields, each one 1px dot whose box-shadow list is every star. */
function stars(section: HTMLElement | null) {
  if (!section) return;
  const w = section.clientWidth;
  const h = Math.max(section.clientHeight, 640);
  section.querySelectorAll<HTMLElement>(".hx-stars").forEach((el) => {
    const n = Number(el.dataset.n);
    const blur = Number(el.dataset.blur);
    const [lo, hi] = blur > 0 ? [0.35, 0.7] : [0.05, 0.3];
    el.style.boxShadow = Array.from({ length: n }, () => {
      const alpha = (lo + Math.random() * (hi - lo)).toFixed(2);
      return `${Math.round(Math.random() * w)}px ${Math.round(Math.random() * h)}px ${blur}px 0 rgba(255,246,228,${alpha})`;
    }).join(",");
  });
}

/**
 * The three promises under the hero, as on YouCan: cash on delivery, how many
 * wilayas in 1 to 3 days (from the owner's delivery list) and the exchange
 * window. Said once on the home page; the page does not repeat them.
 */
export function TrustBar(props: { returnsDays: number; wilayaCount: number | null }) {
  return (
    <section className="container-page pt-4 pb-2">
      <TrustCard {...props} />
    </section>
  );
}
