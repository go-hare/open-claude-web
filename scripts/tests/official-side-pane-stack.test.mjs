/**
 * Official ca0135 setSidePane / ur / closeSidePane membership rules for tasks + subagent stack.
 * When tasks is open, openSubagent stacks under it (column) instead of replacing.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

/** Mirrors EpitaxyChatPanel openSidePane / closeSidePane / selectView pure logic. */
function openSidePane(tiles, view) {
  return tiles.includes(view) ? tiles : [...tiles, view];
}

function closeSidePane(tiles, view) {
  return tiles.filter((item) => item !== view);
}

function toggleSidePane(tiles, view) {
  return tiles.includes(view) ? closeSidePane(tiles, view) : openSidePane(tiles, view);
}

test("tasks then subagent stacks both tiles (ur column path)", () => {
  let tiles = [];
  tiles = openSidePane(tiles, "tasks");
  assert.deepEqual(tiles, ["tasks"]);
  tiles = openSidePane(tiles, "subagent");
  assert.deepEqual(tiles, ["tasks", "subagent"]);
});

test("openSubagent alone still opens single subagent tile", () => {
  let tiles = [];
  tiles = openSidePane(tiles, "subagent");
  assert.deepEqual(tiles, ["subagent"]);
});

test("setSidePane of already-open tile does not duplicate", () => {
  let tiles = openSidePane(["tasks", "subagent"], "tasks");
  assert.deepEqual(tiles, ["tasks", "subagent"]);
  tiles = openSidePane(tiles, "subagent");
  assert.deepEqual(tiles, ["tasks", "subagent"]);
});

test("closeSidePane(subagent) keeps tasks (Zs remove one)", () => {
  const tiles = closeSidePane(["tasks", "subagent"], "subagent");
  assert.deepEqual(tiles, ["tasks"]);
});

test("closeSidePane(tasks) keeps subagent when stacked", () => {
  const tiles = closeSidePane(["tasks", "subagent"], "tasks");
  assert.deepEqual(tiles, ["subagent"]);
});

test("toggleSidePane removes when present else inserts", () => {
  let tiles = toggleSidePane([], "tasks");
  assert.deepEqual(tiles, ["tasks"]);
  tiles = toggleSidePane(tiles, "tasks");
  assert.deepEqual(tiles, []);
  tiles = toggleSidePane(tiles, "tasks");
  tiles = toggleSidePane(tiles, "subagent");
  assert.deepEqual(tiles, ["tasks", "subagent"]);
  tiles = toggleSidePane(tiles, "subagent");
  assert.deepEqual(tiles, ["tasks"]);
});
