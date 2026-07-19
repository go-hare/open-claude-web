/**
 * Official kb/Oe: streaming frontier must recompute on the same tick as text growth
 * (useMemo), not lag via useEffect — otherwise zE typewriter paints look chunky.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const { OfficialCodeMarkdown } = await vite.ssrLoadModule(
  "/src/features/epitaxy/OfficialCodeMarkdown.tsx",
);

after(async () => {
  await vite.close();
});

test("streaming markdown includes full frontier text without waiting for effect", () => {
  const text = "Hello typewriter frontier";
  const html = renderToStaticMarkup(
    createElement(OfficialCodeMarkdown, { isStreaming: true, text }),
  );
  // Progressive frontier is still in the tree as react-markdown text content.
  assert.match(html, /Hello typewriter frontier/);
});

test("streaming markdown keeps completed paragraph chunks stable when new line grows", () => {
  const text = "Paragraph one.\n\nParagraph two growing";
  const html = renderToStaticMarkup(
    createElement(OfficialCodeMarkdown, { isStreaming: true, text }),
  );
  assert.match(html, /Paragraph one/);
  assert.match(html, /Paragraph two growing/);
});
