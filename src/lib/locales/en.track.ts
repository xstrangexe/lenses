/** Order lookup by phone number on the tracking page. */
import type { arTrack } from "./ar.track";

export const enTrack: Record<keyof typeof arTrack, string> = {
  "track.title": "Track your order with your phone",
  "track.body": "Enter the number you used when ordering to see where your orders are.",
  "track.phoneLabel": "Phone number",
  "track.phoneInvalid": "That number is not valid. Write it like this: 0555123456",
  "track.search": "Show my orders",
  "track.searching": "Searching…",
  "track.noOrders":
    "No order found for this number. Check the number you used when ordering and try again.",
  "track.rateLimited": "Too many attempts. Try again in {minutes} min.",
  "track.failed": "Could not search right now. Please try again shortly.",
  "track.found": "Your orders ({count})",
  "track.orderFrom": "Order of {date}",
  "track.recipient": "Recipient",
  "track.showDetails": "Show tracking",
  "track.hideDetails": "Hide",
  "track.privacy": "For your safety we never show the full address or full name.",
  "track.haveNumber": "Have an order number?",
};
