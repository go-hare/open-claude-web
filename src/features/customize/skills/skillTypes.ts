/** Built-in skill row — host slash command with scope "cowork" (official aRe). */
export type BuiltInSkill = {
  name: string;
  description?: string;
};

/** User/org skill list item (JLe / list-skills). Local shell may start empty. */
export type UserSkill = {
  skillId: string;
  skillName: string;
  description?: string;
  enabled: boolean;
  creatorType?: string;
  partitionBy?: string;
  isShared?: boolean;
  hasOutgoingShares?: boolean;
  sharedVia?: string;
  isPublicProvisioned?: boolean;
};

export type SkillsSelection =
  | { kind: "builtin"; name: string }
  | { kind: "skill"; skillId: string; filePath: string | null }
  | null;
