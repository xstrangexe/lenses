import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import type { TranslationKey } from "@/lib/i18n";
import { normaliseToken, reviewErrorKey, submitOrderReview } from "@/lib/order-review";
import { shrinkPhoto, uploadReviewPhoto } from "@/lib/review-photo";
import { StarRatingInput } from "./star-rating";

export type SendResult = "sent" | "sent_no_photo" | { error: TranslationKey };

/**
 * Sends one review: the photo first (shrunk, then uploaded to the order's own
 * folder), then the review with its address. A photo that cannot be read or
 * uploaded never blocks the review; it is sent without it and the buyer is told.
 * A second tap that finds the review already saved counts as sent.
 */
export async function sendReview(args: {
  token: string;
  productId: string;
  rating: number;
  comment: string;
  photo: File | null;
}): Promise<SendResult> {
  const token = normaliseToken(args.token);
  const send = (imageUrl: string | null) =>
    submitOrderReview({
      token,
      productId: args.productId,
      rating: args.rating,
      comment: args.comment,
      imageUrl,
    });

  let imageUrl: string | null = null;
  if (args.photo) {
    try {
      imageUrl = await uploadReviewPhoto(token, await shrinkPhoto(args.photo));
    } catch {
      imageUrl = null;
    }
  }
  let result = await send(imageUrl);
  // A refused photo address must not cost the buyer their review.
  if (!result.ok && result.code === "bad_photo" && imageUrl) {
    imageUrl = null;
    result = await send(null);
  }
  if (result.ok || result.code === "already_reviewed") {
    return args.photo && !imageUrl ? "sent_no_photo" : "sent";
  }
  return { error: reviewErrorKey(result.code) };
}

/** The form for one product of a delivered order: stars, a few words, one optional photo. */
export function OrderReviewForm({
  token,
  product,
  onDone,
}: {
  token: string;
  product: { id: string; name: string };
  onDone: (photoSkipped: boolean) => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    setError(null);
    const result = await sendReview({ token, productId: product.id, rating, comment, photo });
    if (typeof result === "object") {
      busy.current = false;
      setSending(false);
      setError(result.error);
      return;
    }
    onDone(result === "sent_no_photo");
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-[16px] border border-outline bg-surface p-5"
    >
      <h2 className="font-display text-xl font-semibold" dir="auto">
        {product.name}
      </h2>

      <StarRatingInput
        name={`rating-${product.id}`}
        label={t("reviews.rating")}
        value={rating}
        onChange={setRating}
      />

      <Field label={t("reviews.comment")} required>
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
        />
      </Field>

      <div className="flex items-center gap-3">
        <input
          ref={picker}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => picker.current?.click()}
        >
          <Camera size={18} aria-hidden="true" />
          {t(photo ? "review.photoChange" : "review.photoAdd")}
        </Button>
        {preview && <img src={preview} alt="" className="size-16 rounded-[12px] object-cover" />}
      </div>

      {error && (
        <p className="text-sm font-medium text-error" role="alert">
          {t(error)}
        </p>
      )}

      <Button type="submit" disabled={sending} className="min-h-11 self-start">
        {t("review.send")}
      </Button>
    </form>
  );
}
