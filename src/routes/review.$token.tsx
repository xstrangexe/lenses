import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ReviewSections } from "@/components/storefront/order-review-sections";
import { StoreLayout } from "@/components/storefront/store-layout";
import { ErrorState, LoadingState } from "@/components/ui/feedback";
import { translate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-context";
import { fetchReviewContext, normaliseToken } from "@/lib/order-review";

export const Route = createFileRoute("/review/$token")({
  head: ({ match }) => ({
    meta: [
      { title: translate(match.context.locale, "review.title") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

/**
 * The page a delivered buyer reaches from the owner's WhatsApp message. The
 * link holds the order's token; the database answers only for a delivered
 * order, so anything else lands on "this link is not available".
 */
function ReviewPage() {
  const token = normaliseToken(Route.useParams().token);
  const { t } = useI18n();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["review-context", token],
    queryFn: () => fetchReviewContext(token),
    retry: false,
  });

  return (
    <StoreLayout>
      <div className="container-page flex max-w-xl flex-col gap-5 py-6 sm:py-10">
        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={t("review.err.failed")} onRetry={() => void refetch()} />
        ) : (
          <ReviewSections token={token} context={data} />
        )}
      </div>
    </StoreLayout>
  );
}
