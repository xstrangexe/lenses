import { Link } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import { useStoreSettings } from "@/lib/queries";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/lib/utils";

/**
 * Storefront header: black with the gold mark, like the brand's packaging.
 *
 * `data-theme="dark"` scopes the dark tokens to the header alone, so every
 * control inside it (locale switcher, links) picks up light text on black
 * without a second set of styles. There is no cart: SHOPORA orders from the
 * product page. No theme toggle either: the shop is always light.
 */
export function SiteHeader() {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  // SHOPORA's own name and logo stand in while the settings row is loading, so
  // a page fetched in the browser never flashes a generic "your online shop".
  const storeName = settings?.name?.trim() || "Dahab Lenses";
  const logoUrl = settings?.logo_url || "/brand/dahab-logo.svg";

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/catalogue", label: t("nav.shop") },
    { to: "/track", label: t("nav.trackOrder") },
  ] as const;

  const iconButton =
    "inline-flex size-10 items-center justify-center rounded-full border border-outline text-on-surface transition-colors hover:bg-surface-mid";

  return (
    <header
      data-theme="dark"
      className="sticky top-0 z-30 border-b border-outline bg-nav-bg text-on-surface"
    >
      <div className="container-page flex h-16 items-center gap-3">
        <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2.5">
          <img
            src={logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
          <span className="truncate font-display text-lg font-semibold tracking-[0.12em] text-primary">
            {storeName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3 py-2 text-sm text-on-surface-muted transition-colors hover:text-on-surface"
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "text-on-surface font-medium" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:block" />
          {/* Phones and tablets have search in the bottom bar. */}
          <Link
            to="/search"
            className={cn(iconButton, "hidden lg:inline-flex")}
            aria-label={t("nav.search")}
          >
            <Search size={18} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(iconButton, "md:hidden")}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("common.close") : t("nav.shop")}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-outline transition-[max-height] duration-300 ease-out-soft md:hidden",
          menuOpen ? "max-h-56" : "max-h-0",
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-3" aria-label="Mobile">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded-[10px] px-3 py-2.5 text-sm hover:bg-surface-mid"
            >
              {link.label}
            </Link>
          ))}
          <LocaleSwitcher className="mt-2 sm:hidden" />
        </nav>
      </div>
    </header>
  );
}
