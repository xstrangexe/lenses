import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import type { ReviewContext } from "@/lib/order-review";
import { OrderReviewForm } from "./order-review-form";

/**
 * What the review page shows for a link: nothing to review (unknown order, or
 * not delivered yet), a form per product still unreviewed, or the thanks once
 * every form is sent. The data arrives already fetched, so this part is pure
 * enough to render without a router.
 */
export function ReviewSections({
  token,
  context,
}: {
  token: string;
  context: ReviewContext | null;
}) {
  const { t } = useI18n();
  const [done, setDone] = useState<string[]>([]);
  const [photoSkipped, setPhotoSkipped] = useState(false);

  if (!context) return <Notice>{t("review.unavailable")}</Notice>;

  const pending = context.products.filter((p) => !p.reviewed && !done.includes(p.id));
  if (pending.length === 0) {
    return done.length > 0 ? (
      <Thanks photoSkipped={photoSkipped} />
    ) : (
      <Notice>{t("review.nothingLeft")}</Notice>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">
        {t("review.thanksFor", { name: context.first_name })}
      </h1>
      {pending.map((product) => (
        <OrderReviewForm
          key={product.id}
          token={token}
          product={product}
          onDone={(skipped) => {
            setDone((list) => [...list, product.id]);
            if (skipped) setPhotoSkipped(true);
          }}
        />
      ))}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[16px] border border-outline bg-surface p-5 text-center text-on-surface-muted">
      {children}
    </p>
  );
}

function Thanks({ photoSkipped }: { photoSkipped: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-outline bg-surface p-8 text-center">
      <CheckCircle2 size={32} className="text-positive" aria-hidden="true" />
      <h1 className="font-display text-xl font-semibold">{t("review.thanksTitle")}</h1>
      <p className="text-on-surface-muted">{t("review.thanksBody")}</p>
      {photoSkipped && <p className="text-sm text-on-surface-muted">{t("review.photoFailed")}</p>}
    </div>
  );
}
