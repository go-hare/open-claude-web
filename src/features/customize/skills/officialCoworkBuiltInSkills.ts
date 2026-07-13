import type { BuiltInSkill } from "./skillTypes";

/**
 * Official host RT() + K2e builtins (vite-build index.js):
 * - schedule / setup-cowork / consolidate-memory (W7, rUi) with scope cowork
 * - context from COWORK_CLI_EXPOSED_COMMANDS (K2e)
 *
 * Frontend aRe only keeps scope==="cowork". This list is the union the Skills
 * Built-in section must show when host is reachable; used as merge fallback so
 * a stale host binary cannot drop consolidate-memory.
 */
export const OFFICIAL_COWORK_BUILTIN_SKILLS: BuiltInSkill[] = [
  {
    name: "consolidate-memory",
    description:
      "Reflective pass over your memory files — merge duplicates, fix stale facts, prune the index.",
  },
  {
    name: "context",
    description: "Show what's using your context window",
  },
  {
    name: "schedule",
    description:
      "Create a scheduled task that can be run on demand or automatically on an interval.",
  },
  {
    name: "setup-cowork",
    description: "Guided Cowork setup — install a matching plugin, try a skill, connect tools.",
  },
];

/** Merge host cowork-scoped commands with official RT()/K2e builtins (host wins on description). */
export function mergeBuiltInSkills(hostSkills: BuiltInSkill[]): BuiltInSkill[] {
  const byName = new Map<string, BuiltInSkill>();
  for (const skill of OFFICIAL_COWORK_BUILTIN_SKILLS) {
    byName.set(skill.name, skill);
  }
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
