# Review invites with a photo (design)

Status: awaiting the owner's approval. Nothing below is built yet.

## Why

The shop has 0 approved reviews and nothing asks a buyer for one. The product page then has no proof
that real people received their orders, which is what a cautious cash-on-delivery buyer looks for.
The review form today is open to anyone, has no photo field, and is not tied to an order. The goal is
to turn delivered orders into reviews that carry a photo, are tied to a real order, and are approved
by the owner before they show.

## Goals

- The owner can send a delivered buyer a WhatsApp message with a personal review link in two taps.
- The link opens a short page: stars, a comment, one optional photo. The buyer types no name or
  order number.
- The review is stored unapproved. The owner sees it in the admin with its photo and with a mark that
  it comes from a real order, then approves it as today.
- An approved review with a photo shows where reviews already show (product page, shop-wide block).

## Non-goals

- A "verified buyer" badge on the public page (later; it needs a public view of the link table).
- Anything sent automatically: no automatic WhatsApp or SMS, no reminders. The owner presses send.
- More than one photo, editing a review after sending, reviews of undelivered orders.
- Changing the existing open review form on the product page.

## Anti-goals (a failure even if it works)

- Anyone without a delivered order's link can submit through the new path or upload to the new bucket.
- The review page or its data reveals a buyer's phone number or address.
- Any change to existing tables, triggers or policies, since the database is shared by both shops
  and has no backups.
- Anything publishes without the owner's approval.

## Constraints

- Orders are readable only through `track_order()`; there is no public select on orders or lines.
- Order lines hold `variant_id` (nullable, set null when a variant is deleted), not a product id.
  The product is found through the variant. A line whose variant is gone cannot be reviewed.
- Files are limited to 250 lines and functions to 120. `npm run check` must pass.
- The owner runs the SQL by hand in the Supabase SQL editor. The saved import query that sits in
  that editor must be replaced before running anything.

## Approaches considered

- **A. A review page tied to the order (chosen).** The link holds the order's public token. New
  security-definer functions read what the page needs and write the review; a new bucket takes the
  photo. Trades: one SQL script to run, and a new route.
- B. A link to the product page with the form open. Trades: no proof of purchase, and anyone can
  still submit. Rejected: it does not answer the problem.
- C. Text only. Trades: no database change, but no photo, which is the proof that persuades.
  Rejected by the owner.

## Design

### Database (additive only, `supabase/review-invites.sql`, also folded into `schema.sql`)

1. Table `review_orders (review_id uuid primary key references reviews on delete cascade, order_id
   uuid not null references orders on delete cascade, product_id uuid not null references products
   on delete cascade, unique (order_id, product_id))`. RLS on, no anon grants, one admin policy like
   the other tables. This is how a review is tied to an order without touching `reviews`.
2. Function `review_context(p_token uuid) returns jsonb`: null unless the order exists and its status
   is `delivered`. Returns the buyer's first name and, for each distinct product on the order, its
   id, name, slug and whether a review already exists. No phone, address or ids of orders.
3. Function `submit_order_review(p_token uuid, p_product_id uuid, p_rating int, p_comment text,
   p_image_url text) returns jsonb`: checks the order is delivered, the product is on it, there is no
   review yet, rating 1 to 5, comment 3 to 2000 characters, and, if given, that the photo URL points
   into `review-photos/<that token>/`. Inserts the review (name = first name only, or "زبون" when
   that is under 2 characters, which the existing review trigger would refuse; unapproved, which the
   trigger also forces) and the `review_orders` row. Returns `{ok: true}` or a short
   error code the page turns into a Darija sentence.
4. Bucket `review-photos`: public read, 3 MB limit, jpeg/png/webp only. An insert policy allows an
   upload only when the first folder of the path is the token of a delivered order, checked by a
   small stable security-definer function (a policy cannot read `orders` as anon). No update or
   delete for anon.
5. Both functions: `revoke ... from public`, `grant execute ... to anon, authenticated`,
   `set search_path = ''`, as `track_order()` does. A rollback script drops exactly these objects.

### Storefront

- New route `/review/$token` (`noindex`). States: loading; link not valid or order not delivered yet;
  nothing left to review; the form per unreviewed product; thank-you ("shows after we check it");
  error with retry. The form keeps what was typed on error.
- The photo is shrunk in the browser first (longest side 1200 px, JPEG about 80 percent, canvas, no
  new dependency), uploaded to `review-photos/<token>/<uuid>.jpg`, then its URL goes to
  `submit_order_review`. A failed upload says so and the buyer can send without a photo.
- On `/order/<token>` for a delivered order, a quiet link "قيّم طلبك" to the review page.

### Admin

- Order detail, when status is `delivered`: a button that opens WhatsApp to the buyer's number with a
  Darija message and `https://shoporadz.top/review/<token>` (the shop's fixed address from `src/lib/site-url.ts`), and a
  copy-link button. Nothing is sent until the owner presses send in WhatsApp.
- Review moderation: show the photo (it is not shown today) and a "from a real order" mark read from
  `review_orders`. Approve and delete work as now.

### Testing

Unit tests for the pure parts (first name, message and link builder, photo path check, image sizing
maths). Component tests for the review page states with the data mocked, as `shop-reviews.test.tsx`
does. The SQL gets new checks in `supabase/verify.sql` (each function's refusals: not delivered,
wrong product, already reviewed, bad rating, photo path from another order). There is no throwaway
database set up for this project, so the SQL is written to be additive and reversible, and the owner
runs the verify queries right after running it; the rollback file undoes it in one step.

## Rollout order

1. Owner reads and runs `review-invites.sql` in the SQL editor (additive; rollback file included).
2. Code is deployed. Until step 1, the review page answers "not available" and nothing else breaks.
3. Owner marks a real delivered order, taps the WhatsApp button on it, and tests with their own phone.

## My calls (change any of them)

- Only the buyer's first name is shown publicly, since reviews are public and orders hold full names.
- One photo, 3 MB cap after shrinking, jpeg/png/webp.
- No public "verified" badge in this version; the mark is admin-only.
- The WhatsApp message text is a draft in the locale files for the owner to reword.

## Left to the builder

Exact Darija wording, the photo preview size, and the markup of the review page, following DESIGN.md.
