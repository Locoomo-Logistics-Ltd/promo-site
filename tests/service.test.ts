import { beforeEach, describe, expect, it } from "vitest";
import { register } from "@/server/service";
import { clientIp, hashIp, ipFingerprint } from "@/server/ip";
import { registrationSchema } from "@/lib/validation";
import type { Mailer, RegistrationRecord, RegistrationStore, StoredRegistration } from "@/server/types";

function fakes(opts: { failMail?: () => boolean; onAppend?: () => void } = {}) {
  const rows: StoredRegistration[] = [];
  const mails: string[] = [];
  const store: RegistrationStore = {
    async list() { return rows.map((r) => ({ ...r })); },
    async append(rec: RegistrationRecord) { rows.push({ ...rec, rowNumber: rows.length + 2 }); opts.onAppend?.(); return rows.length + 1; },
    async update(n, patch) { Object.assign(rows.find((r) => r.rowNumber === n)!, patch); },
  };
  const mailer: Mailer = {
    async sendAdminLink() {},
    async sendConfirmation(r) { if (opts.failMail?.()) throw new Error("boom"); mails.push(r.email); },
    async sendStationLive() {},
  };
  return { rows, mails, deps: { store, mailer } };
}
const input = (email: string, over = {}) =>
  registrationSchema.parse({
    fullName: "Ada Obi", email, phone: "08031234567", item: "Dress", price: "5000", vendorName: "Vee Store",
    vendorSocial: "@v", consent: true, ...over,
  });

beforeEach(() => { delete process.env.IP_POLICY; });

describe("register", () => {
  it("creates one row and sends one email", async () => {
    const f = fakes();
    expect(await register(f.deps, input("a@x.com"), "ip1")).toEqual({ kind: "created", emailSent: true });
    expect(f.rows).toHaveLength(1);
    expect(f.rows[0]).toMatchObject({ status: "ACCEPTED", emailStatus: "SENT", emailAttempts: 1 });
    expect(f.mails).toEqual(["a@x.com"]);
  });

  it("rejects a duplicate email: no new row, no email", async () => {
    const f = fakes();
    await register(f.deps, input("a@x.com"), "ip1");
    expect((await register(f.deps, input("A@X.com"), "ip2")).kind).toBe("duplicate_email");
    expect((await register(f.deps, input("a+promo@x.com"), "ip3")).kind).toBe("duplicate_email");
    expect(f.rows).toHaveLength(1);
    expect(f.mails).toHaveLength(1);
  });

  it("flags same-IP entry for review: row kept, no automatic email", async () => {
    const f = fakes();
    await register(f.deps, input("a@x.com"), "ip1");
    expect((await register(f.deps, input("b@x.com"), "ip1")).kind).toBe("ip_flagged");
    expect(f.rows[1]).toMatchObject({ status: "NEEDS_REVIEW", emailStatus: "SKIPPED" });
    expect(f.mails).toEqual(["a@x.com"]);
  });

  it("IP_POLICY=block writes nothing", async () => {
    process.env.IP_POLICY = "block";
    const f = fakes();
    await register(f.deps, input("a@x.com"), "ip1");
    expect((await register(f.deps, input("b@x.com"), "ip1")).kind).toBe("ip_blocked");
    expect(f.rows).toHaveLength(1);
  });

  it("email failure keeps the registration; retry resends without a second row", async () => {
    let fail = true;
    const f = fakes({ failMail: () => fail });
    expect(await register(f.deps, input("a@x.com"), "ip1")).toEqual({ kind: "created", emailSent: false });
    expect(f.rows[0]).toMatchObject({ emailStatus: "FAILED", emailAttempts: 1 });
    fail = false;
    expect((await register(f.deps, input("a@x.com"), "ip1")).kind).toBe("resent");
    expect(f.rows).toHaveLength(1);
    expect(f.rows[0]).toMatchObject({ emailStatus: "SENT", emailAttempts: 2 });
    expect((await register(f.deps, input("a@x.com"), "ip1")).kind).toBe("duplicate_email");
    expect(f.mails).toHaveLength(1);
  });

  it("stops resending after the attempt cap", async () => {
    const f = fakes({ failMail: () => true });
    for (let i = 0; i < 5; i++) await register(f.deps, input("a@x.com"), "ip1");
    expect(f.rows).toHaveLength(1);
    expect(f.rows[0].emailAttempts).toBe(3);
  });

  it("concurrent identical submissions yield exactly one row and one email", async () => {
    const f = fakes();
    const res = await Promise.all(Array.from({ length: 10 }, () => register(f.deps, input("a@x.com"), "ip1")));
    expect(res.filter((r) => r.kind === "created")).toHaveLength(1);
    expect(f.rows).toHaveLength(1);
    expect(f.mails).toHaveLength(1);
  });

  it("cross-instance race: both rows written, later row is marked and no email sent for it", async () => {
    // Simulate a second server instance writing the same email in between our check and our verify.
    const f = fakes();
    let injected = false;
    const store = f.deps.store;
    const origAppend = store.append.bind(store);
    store.append = async (rec) => {
      const n = await origAppend(rec);
      if (!injected) {
        injected = true;
        // other instance's row lands *before* ours in sheet order
        f.rows.unshift({ ...rec, id: "other", rowNumber: 0 });
        f.rows.forEach((r, i) => (r.rowNumber = i + 2));
        return n + 1;
      }
      return n;
    };
    const r = await register(f.deps, input("a@x.com"), "ip1");
    expect(r.kind).toBe("duplicate_email");
    expect(f.rows.filter((x) => x.status === "ACCEPTED")).toHaveLength(1);
    expect(f.mails).toHaveLength(0);
  });

  it("sheet failure stops everything: no email", async () => {
    const f = fakes();
    f.deps.store.list = async () => { throw new Error("sheets down"); };
    await expect(register(f.deps, input("a@x.com"), "ip1")).rejects.toThrow();
    expect(f.mails).toHaveLength(0);
  });
});

describe("ip", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("uses only the configured trusted header, from the right for x-forwarded-for", () => {
    process.env.TRUSTED_IP_HEADER = "x-forwarded-for";
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    process.env.TRUSTED_IP_HEADER = "cf-connecting-ip";
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6", "cf-connecting-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6" }))).toBeNull();
    expect(clientIp(h({ "cf-connecting-ip": "not-an-ip" }))).toBeNull();
  });
  it("hashes without leaking, and groups IPv6 by /64", () => {
    expect(hashIp("1.2.3.4", "s")).not.toContain("1.2.3.4");
    expect(hashIp("1.2.3.4", "s")).not.toBe(hashIp("1.2.3.4", "t"));
    expect(ipFingerprint("2001:db8:1:2:aaaa::1")).toBe(ipFingerprint("2001:0db8:0001:0002::ffff"));
  });
});

describe("pin storage", () => {
  it("stores the pin link and coordinates on the row", async () => {
    const f = fakes();
    const i = input("pin@x.com", { nomination: "Green Pharmacy", nominationPin: "https://www.google.com/maps/place/X/@6.5069,3.3781,17z" });
    await register(f.deps, i, "ip9");
    expect(f.rows[0]).toMatchObject({ nomination: "Green Pharmacy", nominationLat: 6.5069, nominationLng: 3.3781 });
    expect(f.rows[0].nominationPin).toContain("google.com/maps");
  });
});
