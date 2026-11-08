import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("./supabase/client", () => ({ getSupabase: () => ({ rpc }) }));

import {
  fetchReviewContext,
  isReviewable,
  normaliseToken,
  reviewErrorKey,
  reviewLink,
  submitOrderReview,
} from "./order-review";

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("isReviewable", () => {
  it("is true only for a delivered order", () => {
    expect(isReviewable("delivered")).toBe(true);
    for (const status of ["pending", "confirmed", "shipped", "refused", "cancelled", "returned"]) {
      expect(isReviewable(status)).toBe(false);
    }
  });
});

describe("normaliseToken", () => {
  it("trims and lower-cases, the form the database and the upload folder use", () => {
    expect(normaliseToken("  0F8FAD5B-D9CB-469F-A165-70867728950E ")).toBe(TOKEN);
  });
});

describe("reviewLink", () => {
  it("is the review page on the shop's address", () => {
    expect(reviewLink("abc")).toBe("https://lensdz.vercel.app/review/abc");
  });
});

describe("reviewErrorKey", () => {
  it("has a sentence for every refusal and for a failure", () => {
    expect(reviewErrorKey("already_reviewed")).toBe("review.err.already_reviewed");
    expect(reviewErrorKey("bad_comment")).toBe("review.err.bad_comment");
    expect(reviewErrorKey("failed")).toBe("review.err.failed");
  });
});

describe("fetchReviewContext", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("does not call the database for a token that is not a uuid", async () => {
    await expect(fetchReviewContext("not-a-token")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns null when the order is not delivered or unknown", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchReviewContext(TOKEN)).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("review_context", { p_token: TOKEN });
  });

  it("treats a database without the review functions yet as an unavailable link", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function public.review_context" },
    });
    await expect(fetchReviewContext(TOKEN)).resolves.toBeNull();
  });

  it("still throws on any other database error", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "500", message: "down" } });
    await expect(fetchReviewContext(TOKEN)).rejects.toThrow("down");
  });

  it("asks the database with the normalised token even when the link was upper case", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await fetchReviewContext(TOKEN.toUpperCase());
    expect(rpc).toHaveBeenCalledWith("review_context", { p_token: TOKEN });
  });

  it("returns the products to review", async () => {
    const context = {
      first_name: "Amine",
      products: [{ id: "p", name: "Case", slug: "case", reviewed: false }],
    };
    rpc.mockResolvedValue({ data: context, error: null });
    await expect(fetchReviewContext(TOKEN)).resolves.toEqual(context);
  });
});

describe("submitOrderReview", () => {
  const input = { token: TOKEN, productId: "p1", rating: 5, comment: "جيد", imageUrl: null };
  beforeEach(() => {
    rpc.mockReset();
  });

  it("sends the review as the database function expects it", async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(submitOrderReview(input)).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("submit_order_review", {
      p_token: TOKEN,
      p_product_id: "p1",
      p_rating: 5,
      p_comment: "جيد",
      p_image_url: null,
    });
  });

  it("sends the normalised token", async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    await submitOrderReview({ ...input, token: TOKEN.toUpperCase() });
    expect(rpc).toHaveBeenCalledWith(
      "submit_order_review",
      expect.objectContaining({ p_token: TOKEN }),
    );
  });

  it("passes a refusal code through", async () => {
    rpc.mockResolvedValue({ data: { ok: false, code: "already_reviewed" }, error: null });
    await expect(submitOrderReview(input)).resolves.toEqual({
      ok: false,
      code: "already_reviewed",
    });
  });

  it("turns a transport error into a failure, never a raw message", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "network down" } });
    await expect(submitOrderReview(input)).resolves.toEqual({ ok: false, code: "failed" });
  });

  it("turns a thrown error into a failure", async () => {
    rpc.mockRejectedValue(new Error("boom"));
    await expect(submitOrderReview(input)).resolves.toEqual({ ok: false, code: "failed" });
  });
});
