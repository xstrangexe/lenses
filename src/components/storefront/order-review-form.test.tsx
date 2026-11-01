import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as OrderReview from "@/lib/order-review";

const submit = vi.hoisted(() => vi.fn());
const shrink = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());

vi.mock("@/lib/order-review", async (importOriginal) => ({
  ...(await importOriginal<typeof OrderReview>()),
  submitOrderReview: submit,
}));
vi.mock("@/lib/review-photo", () => ({ shrinkPhoto: shrink, uploadReviewPhoto: upload }));
vi.mock("@/lib/i18n-context", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "ar" }),
}));

import { ReviewSections } from "./order-review-sections";
import { sendReview } from "./order-review-form";

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";
const photo = new File(["x"], "me.jpg", { type: "image/jpeg" });
const args = { token: TOKEN, productId: "p1", rating: 5, comment: "منتج زوين", photo };

describe("ReviewSections", () => {
  const product = (id: string, name: string, reviewed: boolean) => ({
    id,
    name,
    slug: id,
    reviewed,
  });

  it("says the link is unavailable and shows no form when there is no delivered order", () => {
    const html = renderToStaticMarkup(<ReviewSections token={TOKEN} context={null} />);
    expect(html).toContain("review.unavailable");
    expect(html).not.toContain("<textarea");
  });

  it("shows a form only for the product not yet reviewed", () => {
    const context = {
      first_name: "Amine",
      products: [product("a", "Case Rouge", true), product("b", "Case Bleu", false)],
    };
    const html = renderToStaticMarkup(<ReviewSections token={TOKEN} context={context} />);
    expect(html.match(/<textarea/g)).toHaveLength(1);
    expect(html).toContain("Case Bleu");
    expect(html).not.toContain("Case Rouge");
  });

  it("thanks a buyer who has reviewed everything already", () => {
    const context = { first_name: "Amine", products: [product("a", "Case Rouge", true)] };
    const html = renderToStaticMarkup(<ReviewSections token={TOKEN} context={context} />);
    expect(html).toContain("review.nothingLeft");
    expect(html).not.toContain("<textarea");
  });
});

describe("sendReview", () => {
  beforeEach(() => {
    submit.mockReset();
    shrink.mockReset();
    upload.mockReset();
    submit.mockResolvedValue({ ok: true });
  });

  it("uploads the shrunk photo and sends its address with the review", async () => {
    shrink.mockResolvedValue(new Blob(["s"]));
    upload.mockResolvedValue("https://x/review-photos/t/a.jpg");
    await expect(sendReview(args)).resolves.toBe("sent");
    expect(submit).toHaveBeenCalledWith({
      token: TOKEN,
      productId: "p1",
      rating: 5,
      comment: "منتج زوين",
      imageUrl: "https://x/review-photos/t/a.jpg",
    });
  });

  it("sends the review without the photo when the photo cannot be read", async () => {
    shrink.mockRejectedValue(new Error("not an image"));
    await expect(sendReview(args)).resolves.toBe("sent_no_photo");
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }));
    expect(upload).not.toHaveBeenCalled();
  });

  it("sends the review without the photo when the upload fails", async () => {
    shrink.mockResolvedValue(new Blob(["s"]));
    upload.mockRejectedValue(new Error("offline"));
    await expect(sendReview(args)).resolves.toBe("sent_no_photo");
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }));
  });

  it("does not touch photo code when there is no photo", async () => {
    await expect(sendReview({ ...args, photo: null })).resolves.toBe("sent");
    expect(shrink).not.toHaveBeenCalled();
  });

  it("treats a second tap on send as done, not as an error", async () => {
    submit.mockResolvedValue({ ok: false, code: "already_reviewed" });
    await expect(sendReview({ ...args, photo: null })).resolves.toBe("sent");
  });

  it("returns the buyer's sentence for a refusal, never the database's words", async () => {
    submit.mockResolvedValue({ ok: false, code: "bad_comment" });
    await expect(sendReview({ ...args, photo: null })).resolves.toEqual({
      error: "review.err.bad_comment",
    });
    submit.mockResolvedValue({ ok: false, code: "failed" });
    await expect(sendReview({ ...args, photo: null })).resolves.toEqual({
      error: "review.err.failed",
    });
  });
});
