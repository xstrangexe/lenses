import { getSupabase } from "./supabase/client";
import type { TranslationKey } from "./i18n";
import { isTokenShaped } from "./order";
import { absoluteUrl } from "./site-url";

/**
 * The review page's two calls to the database, and the small helpers around them.
 *
 * `review_context()` and `submit_order_review()` are security-definer functions
 * that only answer for a delivered order's token (see `supabase/review-invites.sql`),
 * so nothing here can read or write anything else.
 */
export type ReviewContext = {
  first_name: string;
  products: { id: string; name: string; slug: string; reviewed: boolean }[];
};

/** The refusals `submit_order_review()` can return. */
export type ReviewRefusal =
  | "not_delivered"
  | "not_in_order"
  | "already_reviewed"
  | "bad_rating"
  | "bad_comment"
  | "bad_photo";

export type ReviewResult = { ok: true } | { ok: false; code: ReviewRefusal | "failed" };

/** Null for a malformed token, an unknown order, or one not delivered yet. Throws on a network error. */
export async function fetchReviewContext(token: string): Promise<ReviewContext | null> {
  if (!isTokenShaped(token)) return null;
  const { data, error } = await getSupabase().rpc("review_context", { p_token: token.trim() });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") return null;
  return data as unknown as ReviewContext;
}

/** Never throws: any transport problem becomes `failed`, which the page says in Darija. */
export async function submitOrderReview(input: {
  token: string;
  productId: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
}): Promise<ReviewResult> {
  try {
    const { data, error } = await getSupabase().rpc("submit_order_review", {
      p_token: input.token,
      p_product_id: input.productId,
      p_rating: input.rating,
      p_comment: input.comment,
      p_image_url: input.imageUrl,
    });
    if (error || !data || typeof data !== "object") return { ok: false, code: "failed" };
    return data as unknown as ReviewResult;
  } catch {
    return { ok: false, code: "failed" };
  }
}

export function reviewErrorKey(code: ReviewRefusal | "failed"): TranslationKey {
  return `review.err.${code}`;
}

/** The link the owner sends a delivered buyer. */
export function reviewLink(token: string): string {
  return absoluteUrl(`/review/${token}`);
}
