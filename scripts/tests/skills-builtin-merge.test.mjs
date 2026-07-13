import assert from "node:assert/strict";
import test from "node:test";

/**
 * Mirrors officialCoworkBuiltInSkills.mergeBuiltInSkills (keep in sync).
 * Ensures consolidate-memory is never dropped when host omits it.
 */
const OFFICIAL = [
  { name: "consolidate-memory", description: "Reflective pass" },
  { name: "context", description: "Show context" },
  { name: "schedule", description: "Schedule" },
  { name: "setup-cowork", description: "Setup" },
];

function mergeBuiltInSkills(hostSkills) {
  const byName = new Map();
  for (const skill of OFFICIAL) byName.set(skill.name, skill);
  for (const skill of hostSkills) {
    if (!skill.name) continue;
    const existing = byName.get(skill.name);
    byName.set(skill.name, {
      name: skill.name,
      description: skill.description ?? existing?.description,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

test("merge always includes consolidate-memory when host omits it", () => {
  const merged = mergeBuiltInSkills([
    { name: "schedule", description: "Schedule", scope: "cowork" },
    { name: "setup-cowork", description: "Setup", scope: "cowork" },
    { name: "context", description: "Show context", scope: "cowork" },
  ]);
  assert.deepEqual(
    merged.map((s) => s.name),
    ["consolidate-memory", "context", "schedule", "setup-cowork"],
  );
});

test("merge prefers host description when present", () => {
  const merged = mergeBuiltInSkills([
    { name: "consolidate-memory", description: "Host description" },
  ]);
  assert.equal(merged.find((s) => s.name === "consolidate-memory")?.description, "Host description");
});

test("empty host still yields four official builtins", () => {
  assert.equal(mergeBuiltInSkills([]).length, 4);
  assert.ok(mergeBuiltInSkills([]).some((s) => s.name === "consolidate-memory"));
});
