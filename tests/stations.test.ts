import { describe, expect, it } from "vitest";
import { register } from "@/server/service";
import { markStationEstablished } from "@/server/stations";
import { stationLiveEmail } from "@/server/email";
import { registrationSchema } from "@/lib/validation";
import type { Mailer, RegistrationStore, StoredRegistration } from "@/server/types";

function fakes(failStation = () => false) {
  const rows: StoredRegistration[] = [];
  const sent: string[] = [];
  const store: RegistrationStore = {
    async list() { return rows.map((r) => ({ ...r })); },
    async append(rec) { rows.push({ ...rec, rowNumber: rows.length + 2 }); return rows.length + 1; },
    async update(n, patch) { Object.assign(rows.find((r) => r.rowNumber === n)!, patch); },
  };
  const mailer: Mailer = {
    async sendAdminLink() {},
    async sendConfirmation() {},
    async sendStationLive(r) { if (failStation()) throw new Error("boom"); sent.push(r.email); },
  };
  return { rows, sent, deps: { store, mailer } };
}
const input = (email: string, over = {}) =>
  registrationSchema.parse({ fullName: "Ada Obi", email, phone: "08031234567", item: "Dress", price: "5000", vendorName: "Vee Store", vendorSocial: "@v", consent: true, ...over });

describe("markStationEstablished", () => {
  it("emails once, records status, and never double-sends", async () => {
    const f = fakes();
    await register(f.deps, input("a@x.com", { nomination: "Green Pharmacy", nominationPin: "6.5, 3.3" }), "ip1");
    const id = f.rows[0].id;
    expect((await markStationEstablished(f.deps, id)).kind).toBe("notified");
    expect(f.rows[0]).toMatchObject({ stationStatus: "ESTABLISHED", stationEmailStatus: "SENT" });
    expect((await markStationEstablished(f.deps, id)).kind).toBe("already_notified");
    expect(f.sent).toEqual(["a@x.com"]);
  });
  it("concurrent clicks send one email", async () => {
    const f = fakes();
    await register(f.deps, input("a@x.com", { nomination: "G", nominationPin: "6.5, 3.3" }), "ip1");
    const res = await Promise.all([1, 2, 3].map(() => markStationEstablished(f.deps, f.rows[0].id)));
    expect(res.filter((r) => r.kind === "notified")).toHaveLength(1);
    expect(f.sent).toHaveLength(1);
  });
  it("keeps the station established on email failure and allows retry", async () => {
    let fail = true;
    const f = fakes(() => fail);
    await register(f.deps, input("a@x.com", { nomination: "G", nominationPin: "6.5, 3.3" }), "ip1");
    const id = f.rows[0].id;
    expect((await markStationEstablished(f.deps, id)).kind).toBe("email_failed");
    expect(f.rows[0]).toMatchObject({ stationStatus: "ESTABLISHED", stationEmailStatus: "FAILED" });
    fail = false;
    expect((await markStationEstablished(f.deps, id)).kind).toBe("notified");
    expect(f.sent).toHaveLength(1);
  });
  it("rejects unknown ids and entries without a station", async () => {
    const f = fakes();
    await register(f.deps, input("a@x.com"), "ip1");
    expect((await markStationEstablished(f.deps, "nope")).kind).toBe("not_found");
    expect((await markStationEstablished(f.deps, f.rows[0].id)).kind).toBe("no_station");
    expect(f.sent).toHaveLength(0);
  });
});

it("station email escapes content and only links https pins", () => {
  const base = { id: "abcdef123456", fullName: "Ada <b>", nomination: "<script>x</script>" } as never;
  const a = stationLiveEmail({ ...(base as object), nominationPin: "https://maps.app.goo.gl/x" } as never, "https://s", "h@l.com");
  expect(a.html).not.toContain("<script>");
  expect(a.html).toContain("https://maps.app.goo.gl/x");
  const b = stationLiveEmail({ ...(base as object), nominationPin: "javascript:alert(1)" } as never, "https://s", "h@l.com");
  expect(b.html).not.toContain("javascript:");
});
