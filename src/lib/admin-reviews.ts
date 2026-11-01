import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSupabase } from "./supabase/client";

/**
 * Review moderation, a page at a time.
 *
 * This used to read the newest 200 reviews and filter them in the browser, so a
 * shop past 200 reviews silently lost the oldest ones from moderation. Now the
 * database filters and pages, and both tab counts are real totals.
 */
export type AdminReview = {
  id: string;
  product_id: string | null;
  customer_name: string;
  rating: number;
  comment: string;
  image_url: string | null;
  is_approved: boolean;
  created_at: string;
  products: { name: string; slug: string } | null;
  /** One row when the review was written through an order invite, none otherwise. */
  review_orders: { order_id: string }[];
};

const PAGE_SIZE = 15;
export const ADMIN_REVIEWS_KEY = "admin_reviews";

async function fetchReviewsPage(approved: boolean, page: number) {
  const from = (Math.max(page, 1) - 1) * PAGE_SIZE;
  const { data, error, count } = await getSupabase()
    .from("reviews")
    .select(
      "id, product_id, customer_name, rating, comment, image_url, is_approved, created_at, products ( name, slug ), review_orders ( order_id )",
      { count: "exact" },
    )
    .eq("is_approved", approved)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as AdminReview[],
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function useReviewsPage(approved: boolean, page: number) {
  return useQuery({
    queryKey: [ADMIN_REVIEWS_KEY, approved, page] as const,
    queryFn: () => fetchReviewsPage(approved, page),
    placeholderData: keepPreviousData,
  });
}

async function countReviews(approved: boolean): Promise<number> {
  const { count, error } = await getSupabase()
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("is_approved", approved);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function useReviewCounts() {
  return useQuery({
    queryKey: [ADMIN_REVIEWS_KEY, "counts"] as const,
    queryFn: async () => ({
      pending: await countReviews(false),
      approved: await countReviews(true),
    }),
  });
}

export async function setReviewApproval(id: string, approved: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("reviews")
    .update({ is_approved: approved })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await getSupabase().from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type CustomerReviewInput = {
  productId: string;
  name: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
};

/**
 * A review the owner adds from what a customer sent (a WhatsApp photo and a few
 * words), published straight away.
 *
 * The `validate_review` trigger forces every new row to unapproved, admins
 * included, so it is inserted first and then approved in a second step.
 */
export async function addCustomerReview(input: CustomerReviewInput): Promise<void> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .insert({
      product_id: input.productId,
      customer_name: input.name.trim(),
      rating: input.rating,
      comment: input.comment.trim(),
      image_url: input.imageUrl,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await setReviewApproval(data.id, true);
}
