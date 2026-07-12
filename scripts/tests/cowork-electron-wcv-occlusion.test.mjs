import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(
  path.join(root, "src/features/cowork/session/electronWebContentsViewOcclusion.ts"),
  "utf8",
);
const viewer = readFileSync(
  path.join(root, "src/features/cowork/session/CoworkFileViewer.tsx"),
  "utf8",
);

test("occlusion selector matches official vRt dialog/menu roles", () => {
  assert.match(
    source,
    /\[role="dialog"\], \[role="alertdialog"\], \[role="menu"\], \[role="listbox"\], \[data-occludes-electron-wcv\]/,
  );
});

test("Izt park path prefers host parkAndCapture and restores via showRef", () => {
  assert.match(viewer, /parkApi\(COWORK_NATIVE_PREVIEW_PARKED_BOUNDS\)/);
  assert.match(viewer, /if \(!occluded\) \{\s*showRef\.current\?\.\(\);/s);
  // Official park effect only depends on occluded boolean.
  assert.match(viewer, /}, \[occluded\]\);/);
  // moreOpen (overflow menu) ORs with body-portal occlusion — official d || u.
  assert.match(viewer, /Boolean\(frame\?\.moreOpen\) \|\| overlayOccluded/);
});
