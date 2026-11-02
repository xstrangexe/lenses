import { getSupabase } from "./supabase/client";

/**
 * Order lookup by phone number, for the tracking page.
 *
 * `lookup_orders_by_phone()` is a security-definer function (see
 * `supabase/track-by-phone.sql`): it checks the number, rate-limits the caller
 * and returns only a masked name, the wilaya, status, date, products and total.
 * It never returns an address, a phone or an order token, so nothing here can
 * read anything else.
 */

type LookedUpItem = {
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
};

export type LookedUpOrder = {
  /** First name and the initial of the last, e.g. "Karim B.". */
  name: string;
  wilaya: string;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  total: number;
  created_at: string;
  items: LookedUpItem[];
};

export type PhoneLookupResult =
  | { ok: true; orders: LookedUpOrder[] }
  | { ok: false; code: "invalid_phone" }
  | { ok: false; code: "rate_limited"; retryAfter: number }
  | { ok: false; code: "failed" };

/**
 * An Algerian mobile number in its one stored form, `0XXXXXXXXX`, or null.
 *
 * Accepts `05…`, `06…`, `07…`, `+213…`, `00213…` and `213…`, with spaces, dashes,
 * dots or brackets in between, and Arabic-Indic digits. Landlines are refused:
 * the shop's customers order from a mobile and the lookup is for them.
 */
export function normalisePhone(raw: string): string | null {
  const ascii = raw
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  const compact = ascii.replace(/[\s\-.()]/g, "");
  if (!/^\+?[0-9]+$/.test(compact)) return null;
  const local = compact.replace(/^(\+|00)?213/, "0");
  return /^0[5-7][0-9]{8}$/.test(local) ? local : null;
}

/** Never throws: any transport problem becomes `failed`, which the page says in Darija. */
export async function lookupOrdersByPhone(raw: string): Promise<PhoneLookupResult> {
  const phone = normalisePhone(raw);
  if (!phone) return { ok: false, code: "invalid_phone" };
  try {
    const { data, error } = await getSupabase().rpc("lookup_orders_by_phone", {
      p_phone: phone,
    });
    if (error || !data || typeof data !== "object") return { ok: false, code: "failed" };
    const answer = data as {
      ok?: boolean;
      code?: string;
      retry_after?: number;
      orders?: LookedUpOrder[];
    };
    if (answer.ok && Array.isArray(answer.orders)) return { ok: true, orders: answer.orders };
    if (answer.code === "invalid_phone") return { ok: false, code: "invalid_phone" };
    if (answer.code === "rate_limited") {
      return { ok: false, code: "rate_limited", retryAfter: Math.max(1, answer.retry_after ?? 60) };
    }
    return { ok: false, code: "failed" };
  } catch {
    return { ok: false, code: "failed" };
  }
}
