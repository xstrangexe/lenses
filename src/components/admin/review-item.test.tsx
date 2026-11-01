import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminReview } from "@/lib/admin-reviews";

vi.mock("@/lib/i18n-context", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "ar" }),
}));

import { ReviewItem } from "./review-item";

const base: AdminReview = {
  id: "r1",
  product_id: "p1",
  customer_name: "Amine",
  rating: 5,
  comment: "منتج زوين",
  image_url: null,
  is_approved: false,
  created_at: "2026-11-01T10:00:00Z",
  products: { name: "Case", slug: "case" },
  from_order: false,
};

const render = (review: AdminReview) =>
  renderToStaticMarkup(
    <ReviewItem review={review} busy={false} onApprove={() => {}} onDelete={() => {}} />,
  );

describe("admin ReviewItem", () => {
  it("shows the buyer's photo so it can be judged before approving", () => {
    const html = render({ ...base, image_url: "https://x/review-photos/t/a.jpg" });
    expect(html).toContain('src="https://x/review-photos/t/a.jpg"');
  });

  it("shows no image for a text-only review", () => {
    expect(render(base)).not.toContain("<img");
  });

  it("marks a review that came from a real order", () => {
    expect(render({ ...base, from_order: true })).toContain("admin.reviews.fromOrder");
    expect(render(base)).not.toContain("admin.reviews.fromOrder");
  });
});
