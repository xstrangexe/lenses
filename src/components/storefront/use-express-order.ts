import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-context";
import {
  primaryImage,
  productImage,
  useStoreSettings,
  type CatalogueProduct,
  type CatalogueVariant,
} from "@/lib/queries";
import { rememberOrderPhoto } from "@/lib/order-photo";
import { pickupFee, resolveDelivery, useDeliveryZones } from "@/lib/delivery";
import { useCommunes } from "@/lib/communes";
import { placeOrder } from "@/lib/order";
import { trackInitiateCheckout, trackPurchase } from "@/lib/pixels";
import { zrOfficesIn } from "@/lib/zr-offices";
import {
  ORDER_FIELDS,
  normalisePhone,
  orderAddress,
  orderErrorKey,
  orderFieldErrors,
} from "@/lib/express-order";
import { useOrderFields } from "./use-order-fields";

/**
 * State and submission for the express order form.
 *
 * The order goes through `place_order()`, which prices it from the catalogue,
 * checks stock and the phone, sets the delivery fee and returns the tracking
 * token. Only after that does the buyer reach the confirmation page, and only
 * then is the purchase event sent. `busy` is a ref, not state, so a double tap
 * cannot send a second order before the button re-renders as disabled; it is
 * released only on failure, so a retry is possible and a success is final.
 *
 * The form is `noValidate`: `submit` checks every field itself and puts each
 * problem under its field in the shop's own words, then moves to the first one.
 * A field's message goes away as soon as the buyer changes that field.
 */
export function useExpressOrder({
  product,
  name,
  selected,
  onMissingVariant,
}: {
  product: CatalogueProduct;
  name: string;
  selected: CatalogueVariant | null;
  onMissingVariant: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: settings } = useStoreSettings();
  const { data: zones = [] } = useDeliveryZones();

  const form = useOrderFields();
  const { customerName, phone, wilaya, commune, address, method, office, quantity } = form.fields;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const started = useRef(false);

  const communes = useCommunes(wilaya);
  const unitPrice = selected?.price ?? Math.min(...product.product_variants.map((v) => v.price));
  const maxQty = Math.max(1, Math.min(selected?.stock ?? 10, 10));
  const subtotal = unitPrice * quantity;
  const fee = wilaya
    ? resolveDelivery(settings ?? null, zones, wilaya, subtotal, method).fee
    : null;
  const homeFee = wilaya ? resolveDelivery(settings ?? null, zones, wilaya, subtotal).fee : 0;
  const officeFee = pickupFee(zones, wilaya || null);
  const item = () => [{ id: product.id, name, price: unitPrice, quantity }];

  // "Started" means the buyer typed or picked something, not that the form
  // scrolled into view.
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackInitiateCheckout(item());
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    setError(null);
    const element = event.currentTarget;
    const found = orderFieldErrors({
      name: customerName,
      phone,
      wilaya,
      commune,
      officeId: office.id,
      officeNeeded: method === "stopdesk" && officeFee !== null && zrOfficesIn(wilaya).length > 0,
    });
    form.setErrors(found);
    // The model is picked above the form, so a missing one takes the buyer back
    // up there; the field messages are waiting when they come back down.
    if (!selected) {
      setError(t("express.pickVariant"));
      onMissingVariant();
      return;
    }
    if (ORDER_FIELDS.some((field) => found[field])) {
      requestAnimationFrame(() => focusFirstError(element));
      return;
    }

    busy.current = true;
    setSubmitting(true);
    const communeLabel = communes.find(([latin]) => latin === commune)?.[1] ?? commune;
    const result = await placeOrder(
      {
        customer_name: customerName.trim(),
        phone: normalisePhone(phone),
        wilaya,
        commune: commune || null,
        address: orderAddress(address, communeLabel, wilaya),
        delivery_method: method,
        stopdesk_id: method === "stopdesk" ? office.id || null : null,
        stopdesk_name: method === "stopdesk" ? office.name || null : null,
      },
      [{ variant_id: selected.id, quantity }],
    );

    if (result.error || !result.token) {
      busy.current = false;
      setSubmitting(false);
      setError(t(orderErrorKey(result.error, result.code)));
      return;
    }
    trackPurchase(item(), subtotal + (fee ?? 0), result.token);
    rememberOrderPhoto(result.token, primaryImage(selected) ?? productImage(product));
    void navigate({
      to: "/order/$token",
      params: { token: result.token },
      search: { placed: true },
    });
  };

  return {
    fields: form.fields,
    set: form.set,
    errors: form.errors,
    clearError: form.clearError,
    showError: form.showError,
    error,
    submitting,
    communes,
    unitPrice,
    maxQty,
    fee,
    homeFee,
    officeFee,
    markStarted,
    submit,
  };
}

/** Brings the first field with a message to the middle of the screen and focuses it. */
function focusFirstError(form: HTMLFormElement) {
  const field = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!field) return;
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  field.focus({ preventScroll: true });
}
