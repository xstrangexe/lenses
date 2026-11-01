# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Algerian shoppers, mostly on phones, arriving from Meta and TikTok ads. Arabic (and Darija) is
their first reading language; many are non-technical and wary of buying online. They order
cash on delivery and expect a confirmation call before the parcel ships.

The shop owner (SHOPORA) uses the admin to manage products, orders and the confirmation queue.

## Product Purpose

SHOPORA's own storefront, a fork of OpenStore DZ, replacing the old YouCan shop. It turns ad
traffic into cash-on-delivery orders. Success is an order placed through the product-page form
and confirmed by phone.

## Positioning

An Algeria-first store: Arabic and RTL by default, the wilayas in the owner's delivery list (55 today: ZR Express does not reach Tindouf, Bordj Badji Mokhtar or Djanet) with ZR Express home or
pickup-office delivery, and no account, cart or online payment between the buyer and the order.

## Operating Context

- Buyers land on `/product/<slug>` from an ad, read the page, fill the express order form
  (name, phone, wilaya, commune, home or office, optional address, quantity) and submit.
- "أطلب الآن" buttons only scroll to the form or open the product page. There is no cart.
- Orders are priced server-side by `place_order()` and exported to the "SHOPORA Orders" sheet.
- Production: https://shoporadz.top (Vercel), backup on Cloudflare Workers.

## Capabilities and Constraints

- Cash on delivery only. The platform never holds money.
- Products can have colour and phone-model variants. None is pre-selected, so the buyer must pick.
- Meta and TikTok pixels track PageView, ViewContent, InitiateCheckout and Purchase.
- Max 250 lines per file and `npm run check` must pass (see `AGENTS.md`).

## Brand Commitments

- Name: SHOPORA. Palette: black, cream (#f6eee6) and champagne gold (#c9a96e). The tokens are in `DESIGN.md`.
- The voice is plain and friendly. Error messages are in Darija and never show raw technical errors.

## Evidence on Hand

- Product photography and creatives: `C:\Users\hp\Desktop\Shopora\Products`, `Creative 1-3`, `Logo`.
- Customer photo reviews and the FAQ/exchange policy are already in the storefront.
- Do not invent review counts, ratings, stock claims or delivery promises the shop does not make.

## Product Principles

1. One obvious primary action per screen: order now.
2. Trust before persuasion: cash on delivery, delivery price per wilaya and a real exchange policy, all visible.
3. Photography sells and chrome yields.
4. Mobile first, with no horizontal overflow at 320px.

## Accessibility & Inclusion

WCAG AA contrast is asserted by `e2e/accessibility.spec.ts` (axe-core). Tap targets are at
least 32px, and 44px for primary controls. Animations respect `prefers-reduced-motion`. Arabic
uses its own density setting (17px / 1.75).
