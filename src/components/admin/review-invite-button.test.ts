import { describe, expect, it } from "vitest";
import { reviewInviteHref } from "./review-invite-button";

const message = (name: string, link: string) => `${name}|${link}`;
const order = { phone: "0555123456", customer_name: "Amine Ben Ali", public_token: "T" };

describe("reviewInviteHref", () => {
  it("opens WhatsApp to the buyer's number with their first name and review link", () => {
    const href = reviewInviteHref(order, message);
    expect(href).not.toBeNull();
    const [base, query] = (href as string).split("?text=");
    expect(base).toBe("https://wa.me/213555123456");
    expect(decodeURIComponent(query)).toBe("Amine|https://lensdz.vercel.app/review/T");
  });

  it("works for an Arabic name and a +213 number", () => {
    const href = reviewInviteHref(
      { phone: "+213 555 12 34 56", customer_name: "محمد أمين", public_token: "T" },
      message,
    );
    expect(href).toContain("https://wa.me/213555123456?text=");
    expect(decodeURIComponent((href as string).split("?text=")[1])).toBe(
      "محمد|https://lensdz.vercel.app/review/T",
    );
  });

  it("gives no link when the phone number is not usable", () => {
    expect(reviewInviteHref({ ...order, phone: "12" }, message)).toBeNull();
  });
});
