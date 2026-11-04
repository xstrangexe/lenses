import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/storefront/store-layout";
import { StockLanding } from "@/components/storefront/stock-landing";
import { ErrorState, ProductSkeleton } from "@/components/ui/feedback";
import { EMPTY_FILTERS, cataloguePageQuery, useCataloguePage } from "@/lib/catalogue";
import { storeSettingsQuery } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site-url";
import { translate } from "@/lib/i18n";
import { modelSearch } from "@/lib/phone-models";

/**
 * The ad landing page. A link can carry the buyer's phone, `/stock?model=14-pro-max`,
 * so an ad made for one model opens with it already chosen. `?model=14` works too.
 */
export const Route = createFileRoute("/stock")({
  validateSearch: modelSearch,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(storeSettingsQuery()).catch(() => null),
      context.queryClient.ensureQueryData(cataloguePageQuery(EMPTY_FILTERS, 1)).catch(() => null),
    ]);
  },
  head: ({ match }) => {
    const title = translate(match.context.locale, "stock.pageTitle");
    return {
      meta: [{ title }, { property: "og:title", content: title }],
      links: [{ rel: "canonical", href: absoluteUrl("/stock") }],
    };
  },
  component: StockPage,
});

function StockPage() {
  const { model } = Route.useSearch();
  const navigate = useNavigate();
  const catalogue = useCataloguePage(EMPTY_FILTERS, 1);

  return (
    <StoreLayout>
      {catalogue.isError ? (
        <div className="container-page py-8">
          <ErrorState message={catalogue.error.message} onRetry={() => void catalogue.refetch()} />
        </div>
      ) : catalogue.isPending ? (
        <div className="container-page grid gap-3 py-8">
          <ProductSkeleton />
        </div>
      ) : (
        <StockLanding
          products={catalogue.data.products}
          selectedKey={model ?? null}
          onSelect={(key) => void navigate({ to: "/stock", search: { model: key }, replace: true })}
        />
      )}
    </StoreLayout>
  );
}
