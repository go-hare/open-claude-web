/**
 * Official D1e slash skills reverse-RPC (index-BELzQL5P ~113738–113754):
 * addable_skills_search → vZe(v.current, void 0, keywords)
 * slash_menu_skills_resolve → vZe(b.current, skillNames, keywords)
 * respondSlashMenuSkills(requestId, JSON.stringify(skills[]))
 *
 * Honesty: catalogs come from session getSupportedCommands when available,
 * plus static empty addable catalog when no bridge catalog is injected.
 * Full org/shared skill BFF catalog is residual.
 */

export type CoworkSlashSkillResult = {
  argumentHint?: string;
  description: string;
  isUserCreated?: boolean;
  name: string;
  skillId?: string;
};

/** Official gZe: strip plugin/source prefix after last colon. */
export function normalizeSlashSkillName(name: string): string {
  const idx = name.lastIndexOf(":");
  return idx >= 0 ? name.slice(idx + 1) : name;
}

/**
 * Official vZe: if skillNames present, filter by exact normalized name;
 * else score keywords against name (2) / description (1).
 */
export function filterCoworkSlashSkills(
  skills: CoworkSlashSkillResult[],
  skillNames: string[] | undefined,
  keywords: string[] | undefined,
): CoworkSlashSkillResult[] {
  if (skillNames && skillNames.length > 0) {
    const wanted = new Set(
      skillNames.map((n) => normalizeSlashSkillName(n).toLowerCase()),
    );
    return skills.filter((s) =>
      wanted.has(normalizeSlashSkillName(s.name).toLowerCase()),
    );
  }
  const terms = (keywords ?? []).map((k) => k.toLowerCase()).filter(Boolean);
  if (terms.length === 0) return skills;
  const score = (s: CoworkSlashSkillResult) => {
    const n = s.name.toLowerCase();
    const d = (s.description ?? "").toLowerCase();
    let sc = 0;
    for (const t of terms) {
      if (n.includes(t)) sc += 2;
      else if (d.includes(t)) sc += 1;
    }
    return sc;
  };
  return skills
    .map((s) => ({ s, sc: score(s) }))
    .filter(({ sc }) => sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map(({ s }) => s);
}

/** Process-wide catalogs for reverse-RPC (refs v.current / b.current in official). */
let installedSlashSkills: CoworkSlashSkillResult[] = [];
let addableSlashSkills: CoworkSlashSkillResult[] = [];

export function setCoworkInstalledSlashSkills(
  skills: CoworkSlashSkillResult[],
): void {
  installedSlashSkills = Array.isArray(skills) ? skills : [];
}

export function setCoworkAddableSlashSkills(
  skills: CoworkSlashSkillResult[],
): void {
  addableSlashSkills = Array.isArray(skills) ? skills : [];
}

export function getCoworkInstalledSlashSkills(): CoworkSlashSkillResult[] {
  return installedSlashSkills;
}

export function getCoworkAddableSlashSkills(): CoworkSlashSkillResult[] {
  return addableSlashSkills;
}

export function resolveCoworkSlashMenuSkills(
  skillNames: string[] | undefined,
  keywords: string[] | undefined,
): CoworkSlashSkillResult[] {
  return filterCoworkSlashSkills(installedSlashSkills, skillNames, keywords);
}

export function searchCoworkAddableSkills(
  keywords: string[] | undefined,
): CoworkSlashSkillResult[] {
  return filterCoworkSlashSkills(addableSlashSkills, undefined, keywords);
}

export function parseSkillsEventData(data: unknown): {
  keywords: string[] | undefined;
  requestId: string | null;
  skillNames: string[] | undefined;
} {
  let raw: Record<string, unknown> = {};
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed && typeof parsed === "object") {
        raw = parsed as Record<string, unknown>;
      }
    } catch {
      return { keywords: undefined, requestId: null, skillNames: undefined };
    }
  } else if (data && typeof data === "object") {
    raw = data as Record<string, unknown>;
  }
  const requestId =
    typeof raw.requestId === "string" && raw.requestId.length > 0
      ? raw.requestId
      : null;
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k): k is string => typeof k === "string")
    : undefined;
  const skillNames = Array.isArray(raw.skillNames)
    ? raw.skillNames.filter((k): k is string => typeof k === "string")
    : undefined;
  return { keywords, requestId, skillNames };
}

export function slashCommandsToSkills(
  commands: Array<{ name: string; description?: string; argumentHint?: string }>,
): CoworkSlashSkillResult[] {
  return commands
    .filter((c) => typeof c.name === "string" && c.name.length > 0)
    .map((c) => ({
      name: c.name,
      description: c.description ?? "",
      argumentHint: c.argumentHint,
      skillId: c.name,
    }));
}
