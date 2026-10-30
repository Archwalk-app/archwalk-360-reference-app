import assert from "node:assert/strict";
import { it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginForm } from "../../app/demo-login/login-form";
it("unconfigured demo gate disables entry without rendering credentials", () => {
  const html = renderToStaticMarkup(
    createElement(LoginForm, { returnTo: "/editor", configured: false }),
  );
  assert.match(html, /Demo access is unavailable/);
  assert.match(html, /type="password"/);
  assert.match(html, /disabled/);
  assert.doesNotMatch(html, /DEMO_ACCESS_PASSWORD|DEMO_SESSION_SECRET/);
});
