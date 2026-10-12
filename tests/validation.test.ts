import { describe, expect, it } from "vitest";
import { registrationSchema, emailKey, normalizePhone, normalizeSocial } from "@/lib/validation";

const base = {
  fullName: "Ada Obi", email: "Ada@Example.com", phone: "0803 123 4567", item: "Ankara dress", price: "12500",
  vendorName: "Ada Styles", vendorPhone: "", vendorSocial: "@adastyles", nomination: "", consent: true, website: "",
};
const priceErr = (price: unknown) => {
  const r = registrationSchema.safeParse({ ...base, price });
  return r.success ? null : r.error.issues[0].message;
};

describe("price", () => {
  it("accepts values in (0, 50000]", () => {
    for (const p of ["1", "0.5", "14999", "15000", "49999.99", "50000", "₦12,500", 100]) expect(priceErr(p)).toBeNull();
  });
  it("rejects 0, negatives, above 50000, junk, empty", () => {
    for (const p of ["0", "-5", "50000.01", "60000", "abc", "", "1e3", "NaN"]) expect(priceErr(p)).not.toBeNull();
  });
});

describe("fields", () => {
  it("normalises a valid submission", () => {
    const r = registrationSchema.parse(base);
    expect(r.email).toBe("ada@example.com");
    expect(r.phone).toBe("+2348031234567");
    expect(r.price).toBe(12500);
  });
  it("phones", () => {
    expect(normalizePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("12345")).toBeNull();
  });
  it("optional vendor phone validated only when present", () => {
    expect(registrationSchema.safeParse({ ...base, vendorPhone: "nope" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...base, vendorPhone: "09012345678" }).success).toBe(true);
  });
  it("social", () => {
    expect(normalizeSocial("adastyles")).toBe("@adastyles");
    expect(normalizeSocial("https://www.instagram.com/adastyles/")).toBe("instagram.com/adastyles");
    expect(normalizeSocial("not a handle!!")).toBeNull();
    expect(normalizeSocial("https://evil.example/x")).toBeNull();
  });
  it("requires consent", () => {
    expect(registrationSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it("email key folds aliases", () => {
    expect(emailKey("A.da+promo@Gmail.com")).toBe(emailKey("ada@googlemail.com"));
    expect(emailKey("a.da@corp.com")).not.toBe(emailKey("ada@corp.com"));
  });
});

describe("location pin", () => {
  const parse = (o: object) => registrationSchema.safeParse({ ...base, ...o });
  const good = [
    "https://maps.app.goo.gl/AbCdEf123",
    "https://www.google.com/maps/place/Shop/@6.5069,3.3781,17z/data=!3m1",
    "https://www.google.com/maps?q=6.5069,3.3781",
    "https://maps.apple.com/?ll=6.5069,3.3781",
    "https://www.google.com/maps/place/Green+Pharmacy+Yaba",
    "6.5069, 3.3781",
  ];
  const badPins = [
    "12 Herbert Macaulay Way, Yaba", "near the roundabout", "https://evil.example/maps/place/x", "https://google.com/",
    "https://www.google.com/maps", "https://facebook.com/shop", "javascript:alert(1)", "6.5069", "51.5, -0.12",
    "https://www.google.com/maps/@51.5,-0.12,15z",
  ];
  it("allows no nomination at all", () => expect(parse({}).success).toBe(true));
  for (const g of good) it(`accepts ${g}`, () => expect(parse({ nomination: "Green Pharmacy", nominationPin: g }).success).toBe(true));
  for (const b of badPins) it(`rejects ${b}`, () => expect(parse({ nominationPin: b }).success).toBe(false));
  it("requires a pin when a shop is named", () => expect(parse({ nomination: "Green Pharmacy" }).success).toBe(false));
  it("extracts coordinates", () => {
    const r = registrationSchema.parse({ ...base, nominationPin: "https://www.google.com/maps/place/X/@6.5069,3.3781,17z" });
    expect([r.nominationLat, r.nominationLng]).toEqual([6.5069, 3.3781]);
    expect(registrationSchema.parse({ ...base, nominationPin: "6.5, 3.3" }).nominationPin).toContain("google.com/maps?q=6.5,3.3");
  });
});
