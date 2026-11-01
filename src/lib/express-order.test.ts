import { describe, expect, it } from "vitest";
import {
  isValidDzPhone,
  normalisePhone,
  orderAddress,
  orderErrorKey,
  orderFieldErrors,
} from "./express-order";

describe("isValidDzPhone", () => {
  it("accepts Algerian mobiles in local and international form", () => {
    for (const p of [
      "0555123456",
      "06 61 23 45 67",
      "07-70-12-34-56",
      "+213555123456",
      "213 661234567",
    ]) {
      expect(isValidDzPhone(p)).toBe(true);
    }
  });

  it("accepts landlines", () => {
    expect(isValidDzPhone("021234567")).toBe(true);
    expect(isValidDzPhone("0312345678")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const p of ["", "0555", "0855123456", "05551234567", "+33612345678", "abcdefghij"]) {
      expect(isValidDzPhone(p)).toBe(false);
    }
  });
});

describe("normalisePhone", () => {
  it("turns +213 into a leading zero and drops separators", () => {
    expect(normalisePhone("+213 555 12 34 56")).toBe("0555123456");
    expect(normalisePhone("0555-12-34-56")).toBe("0555123456");
  });
});

describe("orderAddress", () => {
  it("keeps a typed address", () => {
    expect(orderAddress("  Cité 500 logements ", "Bab Ezzouar", "Alger")).toBe(
      "Cité 500 logements",
    );
  });

  it("falls back to commune and wilaya, long enough for the database", () => {
    const address = orderAddress("", "Bab Ezzouar", "Alger");
    expect(address).toBe("Bab Ezzouar، Alger");
    expect(address.length).toBeGreaterThanOrEqual(5);
  });
});

describe("orderErrorKey", () => {
  it("prefers the database hint", () => {
    expect(orderErrorKey("whatever", "phone_blocked")).toBe("checkout.error.phone_blocked");
    expect(orderErrorKey("whatever", "too_many_pending")).toBe("checkout.error.too_many_pending");
  });

  it("maps known messages and falls back to a generic failure", () => {
    expect(orderErrorKey("Invalid Algerian phone number")).toBe("express.phoneInvalid");
    expect(orderErrorKey("Insufficient stock for 14 PRO MAX")).toBe("express.noStock");
    expect(orderErrorKey("Variant unavailable")).toBe("express.unavailable");
    expect(orderErrorKey("Failed to fetch")).toBe("express.failed");
    expect(orderErrorKey(null)).toBe("express.failed");
  });
});

describe("orderFieldErrors", () => {
  const filled = {
    modelMissing: false,
    name: "Amine",
    phone: "0555123456",
    wilaya: "Alger",
    commune: "Bab Ezzouar",
    officeId: "",
    officeNeeded: false,
  };

  it("passes a complete form", () => {
    expect(orderFieldErrors(filled)).toEqual({});
  });

  it("reports every empty field at once", () => {
    const empty = { ...filled, name: " ", phone: "", wilaya: "", commune: "" };
    expect(orderFieldErrors(empty)).toEqual({
      name: "express.nameMissing",
      phone: "express.phoneMissing",
      wilaya: "express.wilayaMissing",
    });
  });

  it("asks for the phone model first when the product has models and none is chosen", () => {
    expect(orderFieldErrors({ ...filled, modelMissing: true })).toEqual({
      model: "express.pickVariant",
    });
  });

  it("tells a wrong number apart from a missing one", () => {
    expect(orderFieldErrors({ ...filled, phone: "1234" }).phone).toBe("express.phoneInvalid");
  });

  it("asks for the commune once the wilaya is picked", () => {
    expect(orderFieldErrors({ ...filled, commune: "" })).toEqual({
      commune: "express.communeMissing",
    });
  });

  it("asks for the office only when pickup has offices to choose from", () => {
    expect(orderFieldErrors({ ...filled, officeNeeded: true }).office).toBe(
      "express.officeMissing",
    );
    expect(orderFieldErrors({ ...filled, officeNeeded: true, officeId: "12" })).toEqual({});
  });
});
