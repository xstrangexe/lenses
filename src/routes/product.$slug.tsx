import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreLayout } from "@/components/storefront/store-layout";
import { ProductDetail } from "@/components/storefront/product-detail";
import { SizeGuide } from "@/components/storefront/size-guide";
import { ReviewsSection } from "@/components/storefront/reviews";
import { ProductFaq } from "@/components/storefront/product-faq";
import { CareTips } from "@/components/storefront/lens-guides";
import { ErrorState } from "@/components/ui/feedback";
import {
  productImage,
  productQuery,
  reviewsQuery,
  storeSettingsQuery,
  useProduct,
} from "@/lib/queries";
import { formatDzd } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-url";
import { sizeGuidesQuery } from "@/lib/size-guides";
import { RelatedProducts } from "@/components/storefront/related-products";
import { localized } from "@/lib/i18n";
import { modelSearch } from "@/lib/phone-models";

export const Route = createFileRoute("/product/$slug")({
  validateSearch: modelSearch,
  loader: async ({ context, params }) => {
    const product = await context.queryClient
      .ensureQueryData(productQuery(params.slug))
      .catch(() => null);
    if (!product) throw notFound();
    // Reviews and size guide are rendered below the fold; fetch them during SSR
    // too so the first paint is complete, but a failure must not blank the page.
    // The settings carry the delivery list, so the wilaya count is right on the
    // first paint instead of appearing after load.
    await Promise.all([
      context.queryClient.ensureQueryData(storeSettingsQuery()).catch(() => null),
      context.queryClient.ensureQueryData(reviewsQuery(product.id)).catch(() => null),
      context.queryClient.ensureQueryData(sizeGuidesQuery(product.id)).catch(() => null),
    ]);
    return { product };
  },
  head: ({ loaderData, match }) => {
    const product = loaderData?.product;
    if (!product) return { meta: [{ title: "Lens DZ" }] };
    const locale = match.context.locale;
    const name = localized(locale, product.name, product.name_fr);
    const description =
      localized(locale, product.description ?? "", product.description_fr)
        .trim()
        .slice(0, 155) || name;
    const prices = product.product_variants.map((v) => v.price);
    const price = prices.length > 0 ? Math.min(...prices) : null;
    const image = productImage(product);
    const url = absoluteUrl(`/product/${product.slug}`);
    // The title carries the price and "cash on delivery", which is what a buyer
    // looks for when the link is shared in a Messenger or WhatsApp chat.
    const title = `${name}${price ? ` — ${formatDzd(price, locale)}` : ""} | Lens DZ`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: absoluteUrl(image) }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(price
          ? [
              { property: "product:price:amount", content: String(price) },
              { property: "product:price:currency", content: "DZD" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { model } = Route.useSearch();
  const { data: live, isError, error, refetch } = useProduct(product.slug);

  const current = live ?? product;

  return (
    <StoreLayout bottomNav={false}>
      {/* Same black-and-gold stage as the home page, so an ad visitor sees one store. */}
      <div className="noir" data-theme="dark">
        <div className="container-page flex flex-col gap-12 py-8 sm:py-12">
          {isError ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : (
            <ProductDetail product={current} initialModel={model} />
          )}

          <CareTips />

          <ProductFaq />

          <SizeGuide productId={current.id} />

          <RelatedProducts product={current} />

          <ReviewsSection productId={current.id} />
        </div>
      </div>
    </StoreLayout>
  );
}
