import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { BottomNav } from "./bottom-nav";
import { AnnouncementBar } from "./announcement-bar";
import { DemoBanner } from "./demo-banner";
import { BrandStyle } from "./brand-style";
import { SovaTicker } from "./sova-home";

/**
 * Shared storefront chrome.
 *
 * Applied per route rather than through a pathless layout route, so a new page
 * has to opt in explicitly. A page that renders without the header is then a
 * visible omission in review rather than a silent inheritance bug.
 *
 * `page-bottom-pad` keeps page content clear of the fixed bottom bar on mobile;
 * the bar is hidden at 1024px and above. Product pages pass `bottomNav={false}`
 * because their own "order now" bar takes that place.
 *
 * There is no cart drawer: buyers order from the product page. The cart code
 * stays in the project only for the old /checkout page.
 *
 * Always light: `data-theme="light"` re-scopes the tokens, so a dark choice made
 * with the admin sidebar's toggle never turns the shop dark for its owner.
 */
export function StoreLayout({
  children,
  bottomNav = true,
}: {
  children: React.ReactNode;
  bottomNav?: boolean;
}) {
  return (
    <div data-theme="light" className="flex min-h-dvh flex-col bg-bg text-on-surface">
      <BrandStyle />
      <DemoBanner />
      <SovaTicker />
      <AnnouncementBar />
      <SiteHeader />
      <main className="page-bottom-pad flex-1 lg:pb-0">{children}</main>
      <SiteFooter />
      {bottomNav && <BottomNav />}
    </div>
  );
}
