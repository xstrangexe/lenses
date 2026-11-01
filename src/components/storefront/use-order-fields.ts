import { useState } from "react";
import type { DeliveryMethod } from "@/lib/delivery";
import type { OrderField, OrderFieldErrors } from "@/lib/express-order";

/**
 * What the buyer typed into the express order form, and the message under each
 * field. Split out of `use-express-order.ts`, which keeps pricing and
 * submission. Picking another wilaya resets everything that depends on it.
 */
export function useOrderFields() {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState<DeliveryMethod>("home");
  const [office, setOffice] = useState({ id: "", name: "" });
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<OrderFieldErrors>({});

  const clearError = (...fields: OrderField[]) =>
    setErrors((prev) => {
      const next = { ...prev };
      for (const field of fields) delete next[field];
      return next;
    });
  const showError = (field: OrderField, key: OrderFieldErrors[OrderField]) =>
    setErrors((prev) => ({ ...prev, [field]: key }));

  const chooseWilaya = (next: string) => {
    clearError("wilaya", "commune", "office");
    setWilaya(next);
    setCommune("");
    setMethod("home");
    setOffice({ id: "", name: "" });
  };

  return {
    fields: { customerName, phone, wilaya, commune, address, method, office, quantity },
    set: {
      setCustomerName,
      setPhone,
      setCommune,
      setAddress,
      setMethod,
      setOffice,
      setQuantity,
      chooseWilaya,
    },
    errors,
    setErrors,
    clearError,
    showError,
  };
}
