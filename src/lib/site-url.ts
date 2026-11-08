/**
 * The shop's public address, for canonical links and share previews.
 *
 * Fixed in code rather than read from `VITE_SITE_URL`: the Vercel copy of that
 * variable needs an email code to edit and kept the old vercel.app address. One
 * constant also makes the Cloudflare backup point search engines and Facebook
 * at the main address instead of competing with it. Change it here if the shop
 * moves to another domain.
 */
const SITE_URL = "https://lensdz.vercel.app";

/** "/product/x" becomes "https://lensdz.vercel.app/product/x"; absolute URLs pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
