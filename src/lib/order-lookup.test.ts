import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("./supabase/client", () => ({ getSupabase: () => ({ rpc }) }));

import { lookupOrdersByPhone, normalisePhone } from "./order-lookup";

describe("normalisePhone", () => {
  it("gives every spelling of one mobile number the same stored form", () => {
    for (const raw of [
      "0555123456",
      "05 55 12 34 56",
      "0555-12-34-56",
      "0555.12.34.56",
      "+213555123456",
      "+213 555 12 34 56",
      "00213555123456",
      "00213 555 123 456",
      "213555123456",
      "  0555123456  ",
      "٠٥٥٥١٢٣٤٥٦",
    ]) {
      expect(normalisePhone(raw), raw).toBe("0555123456");
    }
  });

  it("accepts the 05, 06 and 07 mobile ranges", () => {
    expect(normalisePhone("0661234567")).toBe("0661234567");
    expect(normalisePhone("+213771234567")).toBe("0771234567");
  });

  it("refuses anything that is not an Algerian mobile number", () => {
    for (const raw of [
      "",
      "abc",
      "0555",
      "05551234567",
      "0455123456",
      "021123456",
      "+33612345678",
      "0555 123 456 x",
      "+2130555123456",
    ]) {
      expect(normalisePhone(raw), raw).toBeNull();
    }
  });
});

describe("lookupOrdersByPhone", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("does not call the database for a bad number", async () => {
    await expect(lookupOrdersByPhone("12345")).resolves.toEqual({
      ok: false,
      code: "invalid_phone",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends the normalised number, whatever the buyer typed", async () => {
    rpc.mockResolvedValue({ data: { ok: true, orders: [] }, error: null });
    await lookupOrdersByPhone("+213 555 12 34 56");
    expect(rpc).toHaveBeenCalledWith("lookup_orders_by_phone", { p_phone: "0555123456" });
  });

  it("returns the orders the database found", async () => {
    const order = {
      name: "Karim B.",
      wilaya: "Alger",
      status: "shipped",
      carrier: "ZR Express",
      tracking_number: "ZR123",
      total: 2500,
      created_at: "2026-11-01T10:00:00Z",
      items: [{ product_name: "Case", variant_label: "iPhone 15", quantity: 1, unit_price: 2000 }],
    };
    rpc.mockResolvedValue({ data: { ok: true, orders: [order] }, error: null });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({ ok: true, orders: [order] });
  });

  it("returns an empty list when nothing matches", async () => {
    rpc.mockResolvedValue({ data: { ok: true, orders: [] }, error: null });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({ ok: true, orders: [] });
  });

  it("passes on a rate limit with the wait, at least one second", async () => {
    rpc.mockResolvedValue({
      data: { ok: false, code: "rate_limited", retry_after: 240 },
      error: null,
    });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({
      ok: false,
      code: "rate_limited",
      retryAfter: 240,
    });
    rpc.mockResolvedValue({ data: { ok: false, code: "rate_limited" }, error: null });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toMatchObject({ retryAfter: 60 });
  });

  it("trusts the database's own refusal of a number", async () => {
    rpc.mockResolvedValue({ data: { ok: false, code: "invalid_phone" }, error: null });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({
      ok: false,
      code: "invalid_phone",
    });
  });

  it("turns any transport problem into `failed`, never a throw", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom", code: "PGRST202" } });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({ ok: false, code: "failed" });
    rpc.mockRejectedValue(new Error("offline"));
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({ ok: false, code: "failed" });
    rpc.mockResolvedValue({ data: "weird", error: null });
    await expect(lookupOrdersByPhone("0555123456")).resolves.toEqual({ ok: false, code: "failed" });
  });
});
