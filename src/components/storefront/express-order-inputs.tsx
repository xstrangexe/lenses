import { useState } from "react";
import { Banknote, CheckCircle2, CircleAlert, PhoneCall, Plus, Truck } from "lucide-react";
import { Field, Input } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { deliveryWilayaCount, useStoreSettings } from "@/lib/queries";
import { isValidDzPhone } from "@/lib/express-order";

/** The small fields and the promise row of the express order form, split out of `express-order-form.tsx`. */

/**
 * What is being ordered, as the form's first line: the chosen colour with a
 * "change" link back to the picker, or, before one is picked, the reminder to
 * pick it, so nobody fills six fields and only then learns a colour is missing.
 */
export const COLOUR_PICKER_ID = "colour-picker";

export function ChoiceRow({ label, onChange }: { label: string | null; onChange: () => void }) {
  const { t } = useI18n();
  // To the top of the colour picker, not the centre of the whole picker block,
  // which is taller than a phone screen. With no colour yet, also say so there.
  const goToColours = () => {
    if (!label) onChange();
    document
      .getElementById(COLOUR_PICKER_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <button
      type="button"
      onClick={goToColours}
      className={label ? "xo-choice" : "xo-choice is-missing"}
    >
      {label ? (
        <>
          <span className="xo-choice-key">{t("express.choice.label")}</span>
          <b dir="auto">{label}</b>
          <span className="xo-choice-change">{t("express.choice.change")}</span>
        </>
      ) : (
        <>
          <CircleAlert size={16} aria-hidden="true" />
          <b>{t("express.pickColour")}</b>
        </>
      )}
    </button>
  );
}

/** The buyer's full name; the courier and the confirmation call use it. */
export function NameField({
  value,
  error,
  onChange,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Field label={t("express.fullName")} error={error} required>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="name"
        placeholder={t("express.namePlaceholder")}
        required
        minLength={2}
        maxLength={120}
      />
    </Field>
  );
}

/** The optional address; behind a link it does not lengthen the form. */
export function AddressField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!open && !value) {
    return (
      <button type="button" className="xo-add" onClick={() => setOpen(true)}>
        <Plus size={15} aria-hidden="true" />
        {t("express.addAddress")}
      </button>
    );
  }
  return (
    <Field label={t("express.address")} hint={t("express.addressHint")}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="street-address"
        maxLength={500}
        autoFocus={open && !value}
      />
    </Field>
  );
}

/**
 * Algerian mobile number, typed left to right. A green tick appears as soon as
 * it is valid; the error waits until the buyer leaves the field.
 */
export function PhoneField({
  value,
  error,
  onChange,
  onInvalid,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onInvalid: () => void;
}) {
  const { t } = useI18n();
  const ok = isValidDzPhone(value);
  return (
    <Field label={t("express.phone")} hint={t("express.phoneHint")} error={error} required>
      <span className="xo-phone">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => value && !ok && onInvalid()}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          placeholder="0555 12 34 56"
          required
          maxLength={20}
        />
        {ok && <CheckCircle2 size={20} className="xo-phone-ok" aria-label={t("express.phoneOk")} />}
      </span>
    </Field>
  );
}

/**
 * Three promises, each true of this shop: cash on delivery, a confirmation call
 * before shipping, and the number of wilayas in the owner's delivery list (left
 * out until that list is known, rather than shown with a guessed number).
 */
export function TrustRow() {
  const { t } = useI18n();
  const { data: settings } = useStoreSettings();
  const count = deliveryWilayaCount(settings);
  const items = [
    { icon: Banknote, label: t("home2.trust.cod") },
    { icon: PhoneCall, label: t("express.trustConfirm") },
    ...(count === null ? [] : [{ icon: Truck, label: t("trust2.wilayas", { count }) }]),
  ];
  return (
    <ul className="xo-trust">
      {items.map((item) => (
        <li key={item.label}>
          <span className="xo-trust-icon" aria-hidden="true">
            <item.icon size={16} />
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
