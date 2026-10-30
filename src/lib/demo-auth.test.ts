import assert from "node:assert/strict";
import { it } from "node:test";
import {
  createDemoSession,
  demoCookieName,
  requireDemoApi,
  safeDemoReturn,
  validDemoSession,
  verifyDemoPassword,
} from "./demo-auth";
import { allowDemoLogin } from "./demo-login-limit";
import { POST as logout } from "../app/api/demo/logout/route";
import { POST as login } from "../app/api/demo/login/route";
import { POST as hallwyl } from "../app/api/archwalk/creator-session/route";
import { POST as hotel } from "../app/api/archwalk/plugin/route";
import { POST as hotelCreator } from "../app/api/archwalk/plugin/creator-session/route";
import { POST as publication } from "../app/api/archwalk/plugin/publication/route";
const env = {
  DEMO_ACCESS_PASSWORD: "unit-test-password-only",
  DEMO_SESSION_SECRET: "unit-test-signing-secret-with-at-least-32-chars",
  APP_ORIGIN: "https://reference.example",
};
async function configured(fn: () => unknown) {
  const prior = { ...process.env };
  Object.assign(process.env, env);
  try {
    await fn();
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in prior)) delete process.env[key];
    Object.assign(process.env, prior);
  }
}
it("signed sessions reject tampering, expiry, password rotation and missing configuration", () =>
  configured(() => {
    const now = Date.now(),
      session = createDemoSession(now);
    assert.ok(validDemoSession(session, now));
    assert.ok(!session.includes(env.DEMO_ACCESS_PASSWORD));
    assert.ok(!validDemoSession(session + "x", now));
    const parts = session.split(".");
    parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
    assert.ok(!validDemoSession(parts.join("."), now));
    assert.ok(!validDemoSession(session, now + 8 * 3600 * 1000));
    assert.ok(!validDemoSession(session, now - 1000));
    assert.ok(verifyDemoPassword(env.DEMO_ACCESS_PASSWORD));
    assert.ok(!verifyDemoPassword("incorrect"));
    process.env.DEMO_ACCESS_PASSWORD = "rotated-test-password";
    assert.ok(!validDemoSession(session));
    delete process.env.DEMO_SESSION_SECRET;
    assert.ok(!validDemoSession(session));
    assert.equal(requireDemoApi(new Request(env.APP_ORIGIN))?.status, 503);
  }));
it("safe redirects and authenticated CSRF rejection", () =>
  configured(() => {
    for (const target of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/plugin/../../evil",
      "/api/archwalk/plugin",
      "javascript:alert(1)",
    ])
      assert.equal(safeDemoReturn(target), "/editor");
    assert.equal(
      safeDemoReturn("/plugin/rooms/101?from=hotel"),
      "/plugin/rooms/101?from=hotel",
    );
    const cookie = `${demoCookieName()}=${createDemoSession()}`;
    for (const origin of ["https://evil.example", "null", ""])
      assert.equal(
        requireDemoApi(
          new Request(env.APP_ORIGIN, {
            method: "POST",
            headers: { cookie, origin },
          }),
        )?.status,
        403,
      );
    assert.equal(
      requireDemoApi(
        new Request(env.APP_ORIGIN, {
          method: "POST",
          headers: { cookie, origin: env.APP_ORIGIN },
        }),
      ),
      null,
    );
  }));
it("each Partner handler independently denies unauthenticated and cross-origin calls before fetch", () =>
  configured(async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw Error("Partner must not be called");
    };
    try {
      for (const handler of [hallwyl, hotel, hotelCreator, publication]) {
        assert.equal(
          (
            await handler(
              new Request(env.APP_ORIGIN, {
                method: "POST",
                headers: { origin: env.APP_ORIGIN },
              }),
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await handler(
              new Request(env.APP_ORIGIN, {
                method: "POST",
                headers: {
                  origin: "https://evil.example",
                  cookie: `${demoCookieName()}=${createDemoSession()}`,
                },
              }),
            )
          ).status,
          403,
        );
      }
      assert.equal(calls, 0);
    } finally {
      globalThis.fetch = original;
    }
  }));
it("login rejects wrong password and issues a secure HttpOnly cookie without secrets", () =>
  configured(async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    const req = (password: string) =>
      new Request(env.APP_ORIGIN + "/api/demo/login", {
        method: "POST",
        headers: { origin: env.APP_ORIGIN },
        body: JSON.stringify({ password, returnTo: "//evil.example" }),
      });
    const wrong = await login(req("wrong"));
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get("set-cookie"), null);
    const good = await login(req(env.DEMO_ACCESS_PASSWORD));
    assert.equal(good.status, 200);
    assert.deepEqual(await good.json(), { returnTo: "/editor" });
    const cookie = good.headers.get("set-cookie")!;
    for (const flag of [
      "HttpOnly",
      "Secure",
      "SameSite=lax",
      "Max-Age=28800",
      "Path=/",
    ])
      assert.ok(cookie.includes(flag));
    assert.ok(!cookie.includes(env.DEMO_ACCESS_PASSWORD));
    assert.ok(!cookie.includes(env.DEMO_SESSION_SECRET));
    const exited = await logout(
      new Request("https://internal.example/api/demo/logout", {
        method: "POST",
        headers: { origin: env.APP_ORIGIN },
      }),
    );
    assert.equal(exited.status, 303);
    assert.equal(exited.headers.get("location"), env.APP_ORIGIN + "/viewer");
    assert.match(exited.headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal(
      (
        await logout(
          new Request(env.APP_ORIGIN, {
            method: "POST",
            headers: { origin: "https://evil.example" },
          }),
        )
      ).status,
      403,
    );
  }));
it("login attempt limit is bounded and expires", () => {
  const req = new Request("https://reference.example");
  const now = Date.now() + 30 * 60 * 1000;
  for (let i = 0; i < 10; i++) assert.ok(allowDemoLogin(req, now));
  assert.ok(!allowDemoLogin(req, now));
  assert.ok(allowDemoLogin(req, now + 15 * 60 * 1000));
});
