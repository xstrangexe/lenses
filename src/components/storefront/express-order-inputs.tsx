import { useState } from "react";
import { Banknote, CheckCircle2, PhoneCall, Plus, Truck } from "lucide-react";
import { Field, Input } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { deliveryWilayaCount, useStoreSettings } from "@/lib/queries";
import { isValidDzPhone } from "@/lib/express-order";

/** The small fields and the promise row of the express order form, split out of `express-order-form.tsx`. */

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
