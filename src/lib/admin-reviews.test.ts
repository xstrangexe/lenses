import { describe, expect, it } from "vitest";
import { withOrderMarks, type AdminReview } from "./admin-reviews";

const row = (id: string): Omit<AdminReview, "from_order"> => ({
  id,
  product_id: "p",
  customer_name: "Amine",
  rating: 5,
  comment: "منتج زوين",
  image_url: null,
  is_approved: false,
  created_at: "2026-11-01T10:00:00Z",
  products: null,
});

describe("withOrderMarks", () => {
  it("marks only the reviews that came from a real order", () => {
    const rows = withOrderMarks([row("a"), row("b")], new Set(["b"]));
    expect(rows.map((r) => [r.id, r.from_order])).toEqual([
      ["a", false],
      ["b", true],
    ]);
  });

  it("marks none when the link table is empty or unavailable", () => {
    expect(withOrderMarks([row("a")], new Set()).every((r) => !r.from_order)).toBe(true);
  });
});
