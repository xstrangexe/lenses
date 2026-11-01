import { useState } from "react";
import { Banknote, CheckCircle2, PhoneCall, Plus, Truck } from "lucide-react";
import { Field, Input } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import {
  deliveryWilayaCount,
  primaryImage,
  productImage,
  useStoreSettings,
  type CatalogueProduct,
  type CatalogueVariant,
} from "@/lib/queries";
import { isValidDzPhone } from "@/lib/express-order";
import { DeliveryChoice } from "./delivery-choice";
import { ExpressOrderSummary } from "./express-order-summary";
import { WilayaCommuneFields } from "./express-order-fields";
import { useExpressOrder } from "./use-express-order";

/** The section the "order now" buttons scroll to. */
export const ORDER_FORM_ID = "order";

/**
 * Express order form: the whole purchase on the product page, no cart.
 *
 * A black and gold card, like the brand's packaging, on the cream page: three
 * promises, then name, phone, wilaya and commune — the four fields the YouCan
 * shop asked for — home or office delivery with both prices, and a summary with
 * the one cream button. `data-theme="dark"` scopes the dark tokens to the card,
 * so the shared inputs and selects turn dark without a second set of styles.
 *
 * The order goes through `place_order()`, which prices it from the catalogue,
 * checks stock and the phone, and returns the tracking token; only then does
 * the buyer see the confirmation page. A ref guards against a double tap
 * sending two orders; see `use-express-order.ts`.
 */
export function ExpressOrderForm({
  product,
  name,
  selected,
  variantLabel,
  onMissingVariant,
}: {
  product: CatalogueProduct;
  name: string;
  selected: CatalogueVariant | null;
  variantLabel: string | null;
  /** Called when the buyer submits before picking a model or colour. */
  onMissingVariant: () => void;
}) {
  const { t } = useI18n();
  const order = useExpressOrder({ product, name, selected, onMissingVariant });
  const { fields, set, errors } = order;
  const message = (key: (typeof errors)[keyof typeof errors]) => (key ? t(key) : null);
  const image = primaryImage(selected ?? undefined) ?? productImage(product);

  return (
    <section
      id={ORDER_FORM_ID}
      data-theme="dark"
      className="xo scroll-mt-20"
      aria-labelledby="order-title"
    >
      <header className="xo-head">
        <h2 id="order-title" className="xo-title">
          {t("express.title")}
        </h2>
        <p className="xo-sub">{t("express.subtitle")}</p>
      </header>

      <TrustRow />

      <form
        onSubmit={order.submit}
        noValidate
        onInput={order.markStarted}
        onChange={order.markStarted}
        className="xo-form"
      >
        <Field label={t("express.fullName")} error={message(errors.name)} required>
          <Input
            value={fields.customerName}
            onChange={(e) => {
              set.setCustomerName(e.target.value);
              order.clearError("name");
            }}
            autoComplete="name"
            placeholder={t("express.namePlaceholder")}
            required
            minLength={2}
            maxLength={120}
          />
        </Field>

        <PhoneField
          value={fields.phone}
          error={message(errors.phone)}
          onChange={(value) => {
            set.setPhone(value);
            order.clearError("phone");
          }}
          onInvalid={() => order.showError("phone", "express.phoneInvalid")}
        />

        <WilayaCommuneFields
          wilaya={fields.wilaya}
          commune={fields.commune}
          communes={order.communes}
          wilayaError={message(errors.wilaya)}
          communeError={message(errors.commune)}
          onWilaya={set.chooseWilaya}
          onCommune={(value) => {
            set.setCommune(value);
            order.clearError("commune");
          }}
        />

        <DeliveryChoice
          wilaya={fields.wilaya}
          homeFee={order.homeFee}
          pickupFee={order.officeFee}
          method={fields.method}
          officeId={fields.office.id}
          officeError={message(errors.office)}
          onChange={(next) => {
            order.clearError("office");
            set.setMethod(next.method);
            set.setOffice({ id: next.officeId, name: next.officeName });
          }}
        />

        {fields.method === "home" && (
          <AddressField value={fields.address} onChange={set.setAddress} />
        )}

        <ExpressOrderSummary
          productName={name}
          variantLabel={variantLabel}
          image={image}
          quantity={fields.quantity}
          maxQuantity={order.maxQty}
          onQuantity={set.setQuantity}
          unitPrice={order.unitPrice}
          deliveryFee={order.fee}
          error={order.error}
          submitting={order.submitting}
        />
      </form>
    </section>
  );
}

/** The optional address; behind a link it does not lengthen the form. */
function AddressField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
function PhoneField({
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
    <Field label={t("express.phone")} error={error} required>
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
function TrustRow() {
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
