import assert from "node:assert/strict";
import { it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import EditorPage from "../../app/editor/page";
it("museum editor shows a non-destructive setup state without credentials", async () => {
  const prior = process.env.AW360_API_KEY;
  delete process.env.AW360_API_KEY;
  try {
    const html = renderToStaticMarkup(await EditorPage());
    assert.match(html, /Curator demo workspace/);
    assert.match(html, /Connect the existing Hallwyl Experience/);
    assert.match(html, /No Experience has been created or changed/);
    assert.doesNotMatch(html, /<iframe/);
    assert.ok(
      html.indexOf("data-editor-intro") < html.indexOf("data-editor-workspace"),
    );
  } finally {
    if (prior === undefined) delete process.env.AW360_API_KEY;
    else process.env.AW360_API_KEY = prior;
  }
});
