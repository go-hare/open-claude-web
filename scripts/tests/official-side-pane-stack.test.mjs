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

test("plan then file stacks both tiles (ur column from below)", () => {
  let tiles = [];
  tiles = openSidePane(tiles, "plan");
  assert.deepEqual(tiles, ["plan"]);
  tiles = openSidePane(tiles, "file");
  assert.deepEqual(tiles, ["plan", "file"]);
});

test("openFile again does not replace plan (setSidePane focus-only)", () => {
  let tiles = openSidePane(["plan", "file"], "file");
  assert.deepEqual(tiles, ["plan", "file"]);
});

/**
 * Official qI residual: only newly added ids while a side tile already exists are "entering".
 * First open (empty → plan) is row with chat — not stack enter. Second open (plan → file) enters.
 */
function enteringIdsForTransition(prevTiles, nextTiles) {
  const prev = new Set(prevTiles);
  const next = new Set(nextTiles);
  if (prev.size === 0) return [];
  const added = [];
  for (const id of next) {
    if (!prev.has(id)) added.push(id);
  }
  return added;
}

test("qI enteringIds: plan→file marks only file as entering", () => {
  assert.deepEqual(enteringIdsForTransition(["plan"], ["plan", "file"]), ["file"]);
});

test("qI enteringIds: empty→plan is first open (no stack enter)", () => {
  assert.deepEqual(enteringIdsForTransition([], ["plan"]), []);
});
