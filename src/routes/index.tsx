import { Link, createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/storefront/store-layout";
import { ProductGrid } from "@/components/storefront/product-card";
import { HowToOrder, PromoBand, ReviewWall } from "@/components/storefront/home-sections";
import { BrandRow, LensHero, NoirTrust } from "@/components/storefront/lens-home";
import { CareTips } from "@/components/storefront/lens-guides";
import { ErrorState, NoProducts, ProductSkeleton } from "@/components/ui/feedback";
import { SetupCheck } from "@/components/setup-check";
import { supabaseConfigProblem } from "@/lib/supabase/client";
import {
  categoriesQuery,
  deliveryWilayaCount,
  reviewsQuery,
  storeSettingsQuery,
  useCategories,
} from "@/lib/queries";
import { EMPTY_FILTERS, cataloguePageQuery, useCataloguePage } from "@/lib/catalogue";
import { useI18n } from "@/lib/i18n-context";
import { absoluteUrl } from "@/lib/site-url";

// Three rows on a phone. The rest is one tap away in the shop.
const GRID_SIZE = 6;

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Prefetch both so SSR emits the store name and the catalogue instead of an
    // empty shell. Failures are swallowed: a missing database must render the
    // setup guidance, not a 500.
    const settings = await context.queryClient
      .ensureQueryData(storeSettingsQuery())
      .catch(() => null);
    await Promise.all([
      // Reviews feed the testimonial wall below the fold. Fetching them during
      // SSR avoids a visible pop-in and lets crawlers see the social proof.
      context.queryClient.ensureQueryData(reviewsQuery()).catch(() => null),
      // Brands are the shop's categories; the row sits on the first screen.
      context.queryClient.ensureQueryData(categoriesQuery()).catch(() => null),
      // The product grid is the page. Without this the server HTML ships an
      // empty grid and the buyer waits for the browser to fill it in.
      context.queryClient.ensureQueryData(cataloguePageQuery(EMPTY_FILTERS, 1)).catch(() => null),
    ]);
    return { settings };
  },
  head: ({ loaderData, match }) => {
    const s = loaderData?.settings;
    const ar = match.context.locale === "ar";
    const name = s?.name?.trim();
    const tagline = (ar ? s?.tagline : s?.tagline_fr)?.trim();
    const title = name ? `${name}${tagline ? ` — ${tagline}` : ""}` : "Dahab Lenses";
    const count = deliveryWilayaCount(s);
    const description =
      (ar ? s?.description : s?.description_fr)?.trim() ||
      (ar
        ? `تسوق أونلاين مع الدفع عند الاستلام${count ? ` والتوصيل إلى ${count} ولاية` : ""}.`
        : "Shop online, pay cash on delivery.");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl("/") },
        { property: "og:image", content: absoluteUrl(s?.logo_url || "/brand/dahab-logo.svg") },
      ],
      links: [{ rel: "canonical", href: absoluteUrl("/") }],
    };
  },
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const { settings } = Route.useLoaderData();
  const catalogue = useCataloguePage(EMPTY_FILTERS, 1);
  const { data: categories } = useCategories();
  const configProblem = supabaseConfigProblem();

  // A shop that has not been connected to a database yet must see the setup
  // instructions, not an error boundary. This is the first screen a new owner
  // ever loads, so it has to be the most forgiving one.
  if (configProblem) {
    return (
      <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">{settings?.name ?? "Dahab Lenses"}</h1>
        <SetupCheck />
      </main>
    );
  }

  // Every published lens line; colours and powers are chosen on its page.
  const cases = catalogue.data?.products ?? [];
  const grid = cases.slice(0, GRID_SIZE);
  const wilayaCount = deliveryWilayaCount(settings);
  const brands = (categories ?? []).filter((c) => c.product_count > 0);

  // Noir & Gold: hero, brands, promises, lenses, power guide, care, reviews,
  // how to order.
  return (
    <StoreLayout>
      <div className="noir" data-theme="dark">
        <LensHero hasBrands={brands.length >= 2} />
        <BrandRow brands={brands} />
        <NoirTrust returnsDays={settings?.returns_days ?? 7} wilayaCount={wilayaCount} />

        <section id="catalogue" className="container-page scroll-mt-20 py-10 sm:py-14">
          <h2 className="font-display noir-h2 mb-5">{t("lens.grid.title")}</h2>

          {catalogue.isPending ? (
            <div className="product-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : catalogue.isError ? (
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              <ErrorState
                message={catalogue.error.message}
                onRetry={() => void catalogue.refetch()}
              />
              <SetupCheck />
            </div>
          ) : cases.length === 0 ? (
            <NoProducts />
          ) : (
            <>
              <ProductGrid products={grid} />
              <Link to="/catalogue" className="noir-btn-ghost mt-6">
                {t("best.more")}
              </Link>
            </>
          )}
        </section>
        <CareTips />
        <PromoBand threshold={settings?.free_shipping_threshold ?? 0} />
        <ReviewWall />
        <HowToOrder />
      </div>
    </StoreLayout>
  );
}
