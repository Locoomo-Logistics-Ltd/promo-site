import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.MOCK_SERVICES = "1";
process.env.ADMIN_SESSION_SECRET = "x".repeat(40);

const { inviteAdmin, requestReset, setPassword, verifyLogin, disableAdmin, listAdmins, activeAdmin, passwordProblem } = await import("../src/server/admin-users");
const { mockMailer, adminMail } = await import("../src/server/mock");

const SITE = "http://localhost:3000";
const tokenOf = (url: string) => decodeURIComponent(new URL(url).searchParams.get("token")!);
const last = () => adminMail[adminMail.length - 1];

beforeEach(() => { adminMail.length = 0; (globalThis as any).__mockAdmins.length = 0; vi.useRealTimers(); });

describe("admin invites and passwords", () => {
  it("invite -> set password -> login; token is single use", async () => {
    expect(await inviteAdmin(mockMailer, SITE, { email: "New@Team.com", name: "Ada L", invitedBy: "owner@x.com" })).toBe("invited");
    expect(last().to).toBe("new@team.com");
    const token = tokenOf(last().url);
    expect(await verifyLogin("new@team.com", "whatever-long-pass")).toBeNull(); // not active yet
    expect((await setPassword(token, "short")).ok).toBe(false);
    const r = await setPassword(token, "correct horse battery");
    expect(r.ok).toBe(true);
    expect(await verifyLogin("NEW@team.com", "correct horse battery")).not.toBeNull();
    expect(await verifyLogin("new@team.com", "wrong password here")).toBeNull();
    expect((await setPassword(token, "another good password")).ok).toBe(false); // reused
  });

  it("rejects tampered, malformed and expired tokens", async () => {
    await inviteAdmin(mockMailer, SITE, { email: "a@b.com", name: "", invitedBy: "o" });
    const t = tokenOf(last().url);
    expect((await setPassword(t.slice(0, -2) + "zz", "long enough pass")).ok).toBe(false);
    expect((await setPassword("garbage", "long enough pass")).ok).toBe(false);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 73 * 3600_000);
    expect((await setPassword(t, "long enough pass")).ok).toBe(false);
  });

  it("inviting an active admin is refused; re-inviting a pending one issues a new link that voids the old", async () => {
    await inviteAdmin(mockMailer, SITE, { email: "p@q.com", name: "", invitedBy: "o" });
    const first = tokenOf(last().url);
    expect(await inviteAdmin(mockMailer, SITE, { email: "p@q.com", name: "", invitedBy: "o" })).toBe("invited");
    expect((await setPassword(first, "long enough pass")).ok).toBe(false);
    expect((await setPassword(tokenOf(last().url), "long enough pass")).ok).toBe(true);
    expect(await inviteAdmin(mockMailer, SITE, { email: "p@q.com", name: "", invitedBy: "o" })).toBe("exists");
  });

  it("reset: generic for unknown emails, one link per minute, old password dies, old sessions die", async () => {
    await requestReset(mockMailer, SITE, "nobody@x.com");
    expect(adminMail.length).toBe(0);
    await inviteAdmin(mockMailer, SITE, { email: "u@x.com", name: "U", invitedBy: "o" });
    await setPassword(tokenOf(last().url), "first password ok");
    const u = (await verifyLogin("u@x.com", "first password ok"))!;
    const tag = (await import("../src/server/admin-users")).sessionTag(u.passwordHash);
    expect(await activeAdmin("u@x.com", tag)).not.toBeNull();

    adminMail.length = 0;
    await requestReset(mockMailer, SITE, "u@x.com");
    await requestReset(mockMailer, SITE, "u@x.com"); // throttled
    expect(adminMail.length).toBe(1);
    expect(last().kind).toBe("reset");
    expect((await setPassword(tokenOf(last().url), "second password ok")).ok).toBe(true);
    expect(await verifyLogin("u@x.com", "first password ok")).toBeNull();
    expect(await verifyLogin("u@x.com", "second password ok")).not.toBeNull();
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 1000); // listCached TTL not needed: mutations clear it
    expect(await activeAdmin("u@x.com", tag)).toBeNull(); // old session invalid
  });

  it("disabling signs the person out and blocks reset/login", async () => {
    await inviteAdmin(mockMailer, SITE, { email: "d@x.com", name: "", invitedBy: "o" });
    await setPassword(tokenOf(last().url), "disable me please");
    const [u] = await listAdmins();
    await disableAdmin(u.id);
    expect(await verifyLogin("d@x.com", "disable me please")).toBeNull();
    adminMail.length = 0;
    await requestReset(mockMailer, SITE, "d@x.com");
    expect(adminMail.length).toBe(0);
  });

  it("a failed invite email reports email_failed and a retry works", async () => {
    expect(await inviteAdmin(mockMailer, SITE, { email: "failmail@x.com", name: "", invitedBy: "o" })).toBe("email_failed");
    expect((await listAdmins()).length).toBe(1);
  });

  it("concurrent invites for one email create one row", async () => {
    await Promise.all(Array.from({ length: 6 }, () => inviteAdmin(mockMailer, SITE, { email: "race@x.com", name: "", invitedBy: "o" })));
    expect((await listAdmins()).length).toBe(1);
  });

  it("password rules", () => {
    expect(passwordProblem("short")).toBeTruthy();
    expect(passwordProblem("aaaaaaaaaaaa")).toBeTruthy();
    expect(passwordProblem("person@example.com", "Person@Example.com")).toBeTruthy();
    expect(passwordProblem("a long enough one")).toBeNull();
  });
});
