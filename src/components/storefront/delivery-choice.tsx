import { Building2, Check, Home } from "lucide-react";
import { Field, Select } from "@/components/ui/form";
import { useI18n } from "@/lib/i18n-context";
import { formatDzd } from "@/lib/format";
import { zrOfficesIn } from "@/lib/zr-offices";
import type { DeliveryMethod } from "@/lib/delivery";
import { cn } from "@/lib/utils";

/**
 * Home delivery or pickup at the carrier's office, as two cards side by side.
 *
 * Both cards show from the start, so the buyer knows there is a choice before
 * picking a wilaya; their prices appear once it is picked. Pickup is cheaper and
 * many Algerian buyers prefer it, so it is offered wherever the owner priced
 * it, and greyed out with a reason where not. The office is picked from ZR
 * Express's own list (`zr-offices.ts`), so every pickup order says which office
 * the parcel goes to. In a wilaya with no ZR office the shop confirms it on the
 * confirmation call.
 */
export function DeliveryChoice({
  wilaya,
  homeFee,
  pickupFee,
  method,
  officeId,
  officeError,
  onChange,
}: {
  wilaya: string;
  homeFee: number;
  pickupFee: number | null;
  method: DeliveryMethod;
  officeId: string;
  officeError?: string | null;
  onChange: (next: { method: DeliveryMethod; officeId: string; officeName: string }) => void;
}) {
  const { t, locale } = useI18n();

  const option = (
    value: DeliveryMethod,
    label: string,
    fee: number | null,
    Icon: typeof Home,
    unavailable: string | null,
  ) => {
    const disabled = !wilaya || unavailable !== null;
    const active = method === value && !disabled;
    return (
      <label className={cn("dc-card", active && "is-active", disabled && "is-disabled")}>
        <input
          type="radio"
          name="delivery_method"
          value={value}
          checked={active}
          disabled={disabled}
          onChange={() => onChange({ method: value, officeId: "", officeName: "" })}
          className="sr-only"
        />
        <span className="dc-tick" aria-hidden="true">
          <Check size={12} strokeWidth={3} />
        </span>
        <Icon size={22} className="dc-icon" aria-hidden="true" />
        <span className="dc-label">{label}</span>
        {wilaya && (
          <span className="dc-fee" dir={unavailable ? undefined : "ltr"}>
            {unavailable ?? formatDzd(fee ?? 0, locale)}
          </span>
        )}
      </label>
    );
  };

  const list = wilaya ? zrOfficesIn(wilaya) : [];
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2 text-sm font-medium">{t("checkout.method.title")}</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {option("home", t("checkout.method.home"), homeFee, Home, null)}
        {option(
          "stopdesk",
          t("checkout.method.stopdesk"),
          pickupFee,
          Building2,
          pickupFee === null ? t("express.officeNoneShort") : null,
        )}
      </div>
      {!wilaya && <p className="dc-note">{t("express.deliveryPending")}</p>}

      {method === "stopdesk" &&
        wilaya &&
        pickupFee !== null &&
        (list.length > 0 ? (
          <Field label={t("checkout.stopdesk.choose")} error={officeError} required>
            <Select
              value={officeId}
              required
              onChange={(event) => {
                const office = list.find((o) => String(o.id) === event.target.value);
                onChange({
                  method,
                  officeId: event.target.value,
                  officeName: office ? office.name : "",
                });
              }}
            >
              <option value="">{t("checkout.stopdesk.choose")}</option>
              {list.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} — {office.commune}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="dc-note">{t("checkout.stopdesk.later")}</p>
        ))}
    </fieldset>
  );
}
