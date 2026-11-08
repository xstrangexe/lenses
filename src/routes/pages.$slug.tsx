import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoreLayout } from "@/components/storefront/store-layout";
import { infoPage, pageBlocks } from "@/lib/pages";

export const Route = createFileRoute("/pages/$slug")({
  loader: ({ params }) => {
    const page = infoPage(params.slug);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.page.title} | Lens DZ` : "Lens DZ" }],
  }),
  component: InfoPageView,
});

/**
 * An information page. The text is Arabic only, so the page is pinned to
 * right-to-left even when the buyer browses in French or English.
 */
function InfoPageView() {
  const { page } = Route.useLoaderData();

  return (
    <StoreLayout>
      <article lang="ar" dir="rtl" className="container-page max-w-3xl py-10">
        <h1 className="mb-6 font-display text-2xl font-semibold sm:text-3xl">{page.title}</h1>
        <div className="flex flex-col gap-4 leading-relaxed text-on-surface">
          {pageBlocks(page.body).map((block, index) =>
            block.kind === "heading" ? (
              <h2 key={index} className="mt-4 text-lg font-semibold">
                {block.text}
              </h2>
            ) : block.kind === "list" ? (
              <ul key={index} className="list-disc space-y-2 ps-6">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="text-on-surface-muted">
                {block.text}
              </p>
            ),
          )}
        </div>
      </article>
    </StoreLayout>
  );
}
