import { useI18n } from "@/lib/i18n-context";
import type { TranslationKey } from "@/lib/i18n";
import {
  primaryImage,
  productImage,
  type CatalogueProduct,
  type CatalogueVariant,
} from "@/lib/queries";
import { DeliveryChoice } from "./delivery-choice";
import { ExpressOrderSummary } from "./express-order-summary";
import { WilayaCommuneFields } from "./express-order-fields";
import { ModelField, type ModelChoice } from "./model-field";
import { AddressField, NameField, PhoneField, TrustRow } from "./express-order-inputs";
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
  model,
  onMissingVariant,
}: {
  product: CatalogueProduct;
  name: string;
  selected: CatalogueVariant | null;
  variantLabel: string | null;
  /** The phone model, when the product has models: asked as the form's first field. */
  model: ModelChoice | null;
  /** Called when the buyer submits before picking a colour; returns what to tell them. */
  onMissingVariant: () => TranslationKey;
}) {
  const { t } = useI18n();
  const modelMissing = model !== null && model.selected === null;
  const order = useExpressOrder({ product, name, selected, modelMissing, onMissingVariant });
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
        {model && (
          <ModelField
            choice={{
              ...model,
              onSelect: (picked) => {
                model.onSelect(picked);
                order.clearError("model");
              },
            }}
            error={message(errors.model)}
          />
        )}

        <NameField
          value={fields.customerName}
          error={message(errors.name)}
          onChange={(value) => {
            set.setCustomerName(value);
            order.clearError("name");
          }}
        />

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
