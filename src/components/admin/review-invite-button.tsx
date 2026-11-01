import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import { reviewLink } from "@/lib/order-review";
import { waNumber } from "@/lib/whatsapp";
import type { AdminOrder } from "@/lib/admin";

/**
 * The WhatsApp link that invites a delivered buyer to review: their number, a
 * short message with their first name and their personal review link. Null when
 * the phone number cannot be turned into a WhatsApp number. Nothing is sent
 * from here; WhatsApp opens with the message ready and the owner presses send.
 */
export function reviewInviteHref(
  order: Pick<AdminOrder, "phone" | "customer_name" | "public_token">,
  message: (name: string, link: string) => string,
): string | null {
  const number = waNumber(order.phone);
  if (!number) return null;
  const name = order.customer_name.trim().split(/\s+/)[0] ?? "";
  const text = message(name, reviewLink(order.public_token));
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Shown on a delivered order: send the invite on WhatsApp, or copy the link. */
export function ReviewInviteButton({ order }: { order: AdminOrder }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const href = reviewInviteHref(order, (name, link) =>
    t("admin.reviews.inviteMessage", { name, link }),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reviewLink(order.public_token));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {href && (
        <Button asChild size="sm">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={15} aria-hidden="true" />
            {t("admin.reviews.invite")}
          </a>
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        {t(copied ? "admin.reviews.inviteCopied" : "admin.reviews.inviteCopy")}
      </Button>
    </div>
  );
}
