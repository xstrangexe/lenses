import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

const QUESTIONS = [
  ["pfaq.q1", "pfaq.a1"],
  ["pfaq.q2", "pfaq.a2"],
  ["pfaq.q3", "pfaq.a3"],
  ["pfaq.q4", "pfaq.a4"],
] as const;

/**
 * Four quick answers under the product: when it arrives, whether to pay first,
 * exchanges, and a model not in the list. These are the questions a first-time
 * buyer from an ad would otherwise ask on WhatsApp, or leave over. The full FAQ
 * and the exchange policy are a tap away.
 */
export function ProductFaq() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-3" aria-labelledby="pfaq-title">
      <h2 id="pfaq-title" className="font-display text-xl font-semibold">
        {t("pfaq.title")}
      </h2>
      <div className="flex flex-col gap-2">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question} className="pfaq">
            <summary>
              {t(question)}
              <ChevronDown size={18} aria-hidden="true" className="pfaq-chev" />
            </summary>
            <p>{t(answer)}</p>
          </details>
        ))}
      </div>
      <p className="flex flex-wrap gap-x-5 text-sm font-semibold text-gold-ink">
        <Link
          to="/pages/$slug"
          params={{ slug: "return-policy" }}
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {t("pfaq.policy")}
        </Link>
        <Link
          to="/pages/$slug"
          params={{ slug: "faq" }}
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {t("pfaq.all")}
        </Link>
      </p>
    </section>
  );
}
