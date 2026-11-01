import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShopReviews } from "./shop-reviews";

const reviews = vi.hoisted(() => ({ data: [] as unknown[] }));

vi.mock("@/lib/queries", () => ({ useReviews: () => ({ data: reviews.data }) }));
vi.mock("@/lib/i18n-context", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "ar" }),
}));
vi.mock("./reviews", () => ({
  ReviewItem: ({ review }: { review: { id: string } }) => <li data-review={review.id} />,
}));

const review = (id: string, image: string | null) => ({ id, image_url: image });

describe("ShopReviews", () => {
  beforeEach(() => {
    reviews.data = [];
  });

  it("shows nothing until the shop has an approved review", () => {
    expect(renderToStaticMarkup(<ShopReviews />)).toBe("");
  });

  it("puts reviews with a photo first and shows at most three", () => {
    reviews.data = [
      review("a", null),
      review("b", "https://x/b.jpg"),
      review("c", null),
      review("d", "https://x/d.jpg"),
    ];
    const html = renderToStaticMarkup(<ShopReviews />);
    const ids = [...html.matchAll(/data-review="(\w)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["b", "d", "a"]);
    expect(html).toContain("reviews.shopBody");
  });
});
