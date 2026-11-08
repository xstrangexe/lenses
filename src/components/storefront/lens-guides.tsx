import { useI18n } from "@/lib/i18n-context";

/** Short, general wear-and-care advice. Not medical guidance. */
export function CareTips() {
  const { t } = useI18n();
  const tips = ["lens.care.1", "lens.care.2", "lens.care.3", "lens.care.4"] as const;
  return (
    <section>
      <h2 className="font-display noir-h2">{t("lens.care.title")}</h2>
      <ol className="noir-care">
        {tips.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ol>
      <p className="noir-muted mt-4 text-xs">{t("lens.care.note")}</p>
    </section>
  );
}
