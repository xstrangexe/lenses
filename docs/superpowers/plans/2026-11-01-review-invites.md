# Review invites with a photo: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A delivered buyer gets a WhatsApp link to a short page where they rate, comment and add one photo; the review reaches the owner unapproved, tied to the real order.

**Architecture:** Additive SQL (one table, two security-definer functions, one bucket). A new `/review/$token` route calls the functions through the existing Supabase client. The admin gets an invite button on delivered orders and a photo plus a "from a real order" mark on the moderation list.

**Tech Stack:** TanStack Start/Router, React, Supabase (Postgres RPC, Storage), Vitest, Tailwind. Run `npm run check` (typecheck, lint, tests, knip, build).

**Spec:** `docs/superpowers/specs/2026-11-01-review-invites-design.md`

## Global Constraints

- Max 250 lines per file and 120 per function (ESLint-enforced); `npm run check` must pass.
- SQL is additive only: no change to existing tables, triggers or policies. A rollback file undoes it.
- Public text shows the buyer's first name only; "زبون" when the first name is under 2 characters.
- One photo, 3 MB bucket limit, `image/jpeg`, `image/png`, `image/webp` only; shrunk in the browser to a longest side of 1200 px, JPEG quality 0.8.
- Review links use `absoluteUrl("/review/<token>")` from `src/lib/site-url.ts` (fixed `https://shoporadz.top`, not `VITE_SITE_URL`).
- Customer-facing copy is Darija in `ar.*`, with `fr.*` and `en.*` equivalents; no new dependency.
- Code may ship before the SQL is run; until then the page must say the link is unavailable and nothing else may break.

## Review Focus

- Token of an unknown or not-yet-delivered order: the page says it is unavailable and never shows a form (Task 1 verify queries, Task 3 test).
- An order with two products, one already reviewed: a form only for the other one (Task 3 test).
- A photo that cannot be read or shrunk (corrupt file, unsupported format): the buyer can still send the review without it (Task 2 test, Task 3 test).
- A one-letter or Arabic first name, an empty or 2-character comment: refused or handled with a Darija sentence, never a raw database error (Task 1 verify, Task 2 test).
- A double tap on send: one review exists and the buyer sees the thanks, not an error (Task 1 verify, Task 3 test).

## File Structure

- Create `supabase/review-invites.sql`, `supabase/review-invites-rollback.sql`; modify `supabase/verify.sql`, `supabase/schema.sql`.
- Create `src/lib/order-review.ts` (RPC calls, helpers) and `src/lib/review-photo.ts` (shrink, upload); modify `src/lib/supabase/types.ts`.
- Create `src/routes/review.$token.tsx` and `src/components/storefront/order-review-form.tsx`; modify `src/routes/order.$token.tsx`.
- Create `src/components/admin/review-invite-button.tsx`; modify `src/components/admin/order-detail.tsx`, `src/components/admin/review-item.tsx`, `src/lib/admin-reviews.ts`.
- Modify locales: `src/lib/locales/{ar,fr,en}.order.ts` (buyer page) and `{ar,fr,en}.admin.ts` (admin).
- Modify `docs/DATABASE.md`, `docs/CHANGELOG.md`.

### Task 1: The database objects

**Files:** Create `supabase/review-invites.sql`, `supabase/review-invites-rollback.sql`; modify `supabase/verify.sql`, `supabase/schema.sql` (same objects appended in its numbered sections).

**Interfaces:**
- Produces (SQL, all `security definer`, `set search_path = ''`, `revoke ... from public`, `grant execute ... to anon, authenticated`):
  - `public.review_context(p_token uuid) returns jsonb`: `null` unless the order's status is `delivered`; else `{ "first_name": text, "products": [ { "id": uuid, "name": text, "slug": text, "reviewed": boolean } ] }`, one entry per distinct product reached through `order_items.variant_id -> product_variants.product_id`; lines whose variant is gone are skipped; no phone, address or order ids.
  - `public.submit_order_review(p_token uuid, p_product_id uuid, p_rating int, p_comment text, p_image_url text) returns jsonb`: `{ "ok": true }` or `{ "ok": false, "code": "not_delivered" | "not_in_order" | "already_reviewed" | "bad_rating" | "bad_comment" | "bad_photo" }`. Inserts the `reviews` row (name per Global Constraints, `is_approved` false) and the `review_orders` row. `p_image_url` may be null; if given it must contain `/review-photos/<p_token>/`.
  - Table `public.review_orders (review_id uuid primary key references reviews on delete cascade, order_id uuid not null references orders on delete cascade, product_id uuid not null references products on delete cascade, unique (order_id, product_id))`: RLS on, one admin policy shaped like the one on `reviews`, no anon grants.
  - Bucket `review-photos` (public, 3145728 bytes, the three mime types) plus an insert policy for `anon, authenticated` allowing a path whose first folder is the token of a delivered order, via a stable security-definer helper `public.is_review_upload_allowed(p_folder text) returns boolean`; select policy public; no update or delete for anon.

- [ ] **Step 1:** Write the objects in `review-invites.sql` with `create ... if not exists` / `create or replace` / `drop policy if exists` so it can run twice. Begin the file with a comment telling the owner to replace the saved import query in the SQL editor first.
- [ ] **Step 2:** Write `review-invites-rollback.sql` dropping exactly those objects (functions, table, policies, bucket objects then bucket) and nothing else.
- [ ] **Step 3:** Add to `verify.sql` one query per refusal, each a `select public.submit_order_review(...)`/`review_context(...)` expected to return the stated code: unknown token -> `null`; pending order -> `null`; wrong product -> `not_in_order`; rating 0 and 6 -> `bad_rating`; comment of 2 characters -> `bad_comment`; photo path of another token -> `bad_photo`; a second call for the same order and product -> `already_reviewed`; a name of one letter -> review stored as "زبون". Comment each with its expected result.
- [ ] **Step 4:** Append the same objects to `schema.sql` in the matching sections and add a line to `docs/DATABASE.md` naming the new table, functions and bucket.
- [ ] **Step 5:** Read the SQL once as the database would: every function has `search_path = ''` and schema-qualified names, no object outside this feature is altered. Commit: `feat: database objects for order reviews`.

### Task 2: Library: RPC calls, helpers, photo

**Files:** Create `src/lib/order-review.ts`, `src/lib/order-review.test.ts`, `src/lib/review-photo.ts`, `src/lib/review-photo.test.ts`; modify `src/lib/supabase/types.ts` (add the two functions under `Functions`, by hand, in the generated file's style).

**Interfaces:**
- Produces in `order-review.ts`:
  - `type ReviewContext = { first_name: string; products: { id: string; name: string; slug: string; reviewed: boolean }[] }`
  - `type ReviewRefusal = "not_delivered" | "not_in_order" | "already_reviewed" | "bad_rating" | "bad_comment" | "bad_photo"`
  - `fetchReviewContext(token: string): Promise<ReviewContext | null>` (null for a malformed token via `isTokenShaped`, or a null result; throws on a transport error)
  - `submitOrderReview(input: { token: string; productId: string; rating: number; comment: string; imageUrl: string | null }): Promise<{ ok: true } | { ok: false; code: ReviewRefusal | "failed" }>`
  - `reviewErrorKey(code: ReviewRefusal | "failed"): TranslationKey` returning `review.err.<code>` keys (Task 3 defines the strings); `already_reviewed` maps to `review.err.already_reviewed`.
  - `reviewLink(token: string): string` = `absoluteUrl("/review/" + token)`.
  - `reviewPhotoFolder(token: string): string` = the token itself (the upload folder).
- Produces in `review-photo.ts`:
  - `fitWithin(width: number, height: number, max: number): { width: number; height: number }` (scale down keeping ratio so the longest side is `max`; never scale up; integers)
  - `shrinkPhoto(file: File): Promise<Blob>` (canvas, JPEG 0.8, longest side 1200; rejects when the image cannot be decoded)
  - `uploadReviewPhoto(token: string, photo: Blob): Promise<string>` (uploads to `review-photos/<token>/<crypto.randomUUID()>.jpg`, returns the public URL; throws on failure)

- [ ] **Step 1:** Write failing tests. `order-review.test.ts`: `reviewLink("abc")` equals `"https://shoporadz.top/review/abc"`; `reviewErrorKey("already_reviewed")` is `"review.err.already_reviewed"` and `reviewErrorKey("failed")` is `"review.err.failed"`; `fetchReviewContext("not-a-token")` resolves `null` without calling Supabase (mock `getSupabase`). `review-photo.test.ts`: `fitWithin(4000, 3000, 1200)` is `{ width: 1200, height: 900 }`; `fitWithin(800, 600, 1200)` is `{ width: 800, height: 600 }`; `fitWithin(3000, 4000, 1200)` is `{ width: 900, height: 1200 }`.
- [ ] **Step 2:** Run `npx.cmd vitest run src/lib/order-review.test.ts src/lib/review-photo.test.ts`; expect FAIL (modules missing).
- [ ] **Step 3:** Implement both modules to the signatures above. `submitOrderReview` maps a returned `{ok:false, code}` through unchanged and any thrown or RPC error to `code: "failed"`.
- [ ] **Step 4:** Run the same command; expect PASS. Then `npm run typecheck`; expect no errors.
- [ ] **Step 5:** Commit: `feat: review library for order invites`.

### Task 3: The review page

**Files:** Create `src/routes/review.$token.tsx`, `src/components/storefront/order-review-form.tsx`, `src/components/storefront/order-review-form.test.tsx`; modify `src/lib/locales/{ar,fr,en}.order.ts`.

**Interfaces:**
- Consumes: `fetchReviewContext`, `submitOrderReview`, `reviewErrorKey`, `shrinkPhoto`, `uploadReviewPhoto` (Task 2); `StarRatingInput` from `star-rating`; `Field`, `Textarea` from `ui/form`; `StoreLayout`.
- Produces: route `/review/$token` with `head` meta `robots: noindex` (as `order.$token.tsx`); `OrderReviewForm({ token, product }: { token: string; product: { id: string; name: string } })` which calls `onDone` after success or `already_reviewed`.
- Strings to add (ar, fr, en): `review.title`, `review.thanksFor` ("{name}"), `review.photoAdd`, `review.photoChange`, `review.photoFailed` (says it will send without the photo), `review.send`, `review.thanksTitle`, `review.thanksBody` (appears after the owner checks it), `review.unavailable` (link not valid or order not delivered yet), `review.nothingLeft`, `review.err.failed`, `review.err.not_delivered`, `review.err.not_in_order`, `review.err.already_reviewed`, `review.err.bad_rating`, `review.err.bad_comment`, `review.err.bad_photo`.

- [ ] **Step 1:** Write failing tests in `order-review-form.test.tsx` (mock `@/lib/order-review`, `@/lib/review-photo`, `@/lib/i18n-context` as `shop-reviews.test.tsx` does; render with `renderToStaticMarkup` for static states and call the exported submit helper for behaviour): (a) context `null` renders the `review.unavailable` string and no `<textarea>`; (b) context with two products, one `reviewed: true`, renders exactly one form and its product name; (c) all products reviewed renders `review.nothingLeft`; (d) a submit where `shrinkPhoto` rejects still calls `submitOrderReview` with `imageUrl: null`; (e) a submit returning `already_reviewed` ends in the thanks state, not an error. Export the submit logic as `sendReview(args): Promise<"sent" | { error: TranslationKey }>` from the form file so (d) and (e) test it directly.
- [ ] **Step 2:** Run `npx.cmd vitest run src/components/storefront/order-review-form.test.tsx`; expect FAIL.
- [ ] **Step 3:** Implement the form and route. Layout follows `DESIGN.md` (cream page, paper card, one black primary button, 44 px targets, logical properties). Keep the typed comment and rating on error. Show the chosen photo as a small preview. The route loads the context in the component via `useQuery`, not the route loader, so a transport error shows a retry button.
- [ ] **Step 4:** Run the tests; expect PASS. Run `npm run check`; expect exit 0.
- [ ] **Step 5:** Commit: `feat: review page for delivered orders`.

### Task 4: Link from the order page

**Files:** Modify `src/routes/order.$token.tsx`, `src/lib/locales/{ar,fr,en}.order.ts`.

**Interfaces:** Adds the string `order.reviewLink` ("قيّم طلبك") and a `Link to="/review/$token"` shown only when `data.status === "delivered"`. Consumes the `/review/$token` route from Task 3.

- [ ] **Step 1:** Add the link under the timeline for a delivered order only, styled like the existing `placed.track` link.
- [ ] **Step 2:** Run `npm run check`; expect exit 0. Commit: `feat: link delivered orders to their review page`.

### Task 5: Admin: invite button, photo and mark

**Files:** Create `src/components/admin/review-invite-button.tsx`, `src/components/admin/review-invite-button.test.ts`; modify `src/components/admin/order-detail.tsx`, `src/components/admin/review-item.tsx`, `src/lib/admin-reviews.ts`, `src/lib/locales/{ar,fr,en}.admin.ts`.

**Interfaces:**
- Produces in `review-invite-button.tsx`: `reviewInviteHref(order: { phone: string; customer_name: string; public_token: string }, message: (name: string, link: string) => string): string | null` (a `https://wa.me/<waNumber(phone)>?text=<encoded>` link built with `waNumber` from `src/lib/whatsapp.ts`, or null when the phone is unusable) and `ReviewInviteButton({ order }: { order: AdminOrder })` rendering a WhatsApp link plus a copy-link button.
- `AdminReview` gains `review_orders: { order_id: string }[]` (select `review_orders ( order_id )`); `ReviewItem` shows `image_url` as a thumbnail (about 96 px, links to the full image) and a `Badge` "من طلب حقيقي" when `review_orders.length > 0`.
- Strings: `admin.reviews.invite`, `admin.reviews.inviteCopy`, `admin.reviews.inviteCopied`, `admin.reviews.inviteMessage` ("{name}", "{link}"; Darija draft: thanks, would you share a photo and a word about your order), `admin.reviews.fromOrder`.

- [ ] **Step 1:** Write failing tests: `reviewInviteHref` with phone `0555123456`, name `Amine Ben`, token `T` returns a string starting `https://wa.me/213555123456?text=` whose decoded text contains `Amine` (first name, not `Ben`) and `https://shoporadz.top/review/T`; returns null for phone `"12"`.
- [ ] **Step 2:** Run `npx.cmd vitest run src/components/admin/review-invite-button.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement the button, render it in `order-detail.tsx` only when `order.status === "delivered"`, and update `review-item.tsx` and the select in `admin-reviews.ts`.
- [ ] **Step 4:** Run the test; expect PASS. Run `npm run check`; expect exit 0.
- [ ] **Step 5:** Commit: `feat: admin review invites and photo moderation`.

### Task 6: Docs, hand-off and rollout

**Files:** Modify `docs/CHANGELOG.md`; create the owner's checklist at the end of `supabase/review-invites.sql`'s header comment (already started in Task 1).

- [ ] **Step 1:** Add a CHANGELOG entry. Run `npm run check`; expect exit 0.
- [ ] **Step 2:** Run the local app and open `/review/<a random uuid>`; expect the unavailable message, and no errors in the console beyond blocked trackers. Open the admin reviews page; expect no change for existing reviews.
- [ ] **Step 3:** Commit and push the code. Tell the owner the order: run `review-invites.sql` (after replacing the saved import query), run the verify queries, then send a test invite from a delivered order to their own phone. Redeploy the Cloudflare backup after the push.
- [ ] **Step 4:** After the owner reports the SQL ran, run the verify queries' expected results with them and confirm one end-to-end review (with photo) reaches the admin.
