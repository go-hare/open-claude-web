/**
 * Official index-BELzQL5P PLe / HLe / BLe / KLe / YLe — LocalAgentModeSessions
 * listLocalSkills / saveLocalSkill / setLocalSkillEnabled / deleteLocalSkill /
 * getLocalSkillFiles.
 * Host writes userData/local-agent-mode-sessions/skills-plugin (CUi), not ~/.claude/skills.
 *
 * Official: list query [OLe] is metadata-only (DLe). Files query [OLe,"files",id]
 * (YLe) is independent. ULe/QLe invalidate files after save — list hydrate must
 * not wipe SKILL.md.
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalSkillRecord } from "../../../adapters/desktopBridge/types";
import { formatSkillMarkdown, parseSkillMarkdown } from "./skillMd";
import type { UserSkill } from "./skillTypes";

export type LocalSkillFile = {
  content?: string;
  path: string;
};

const EMPTY_FILES: LocalSkillFile[] = [];

function sanitizeStoredDescription(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed === ">" || trimmed === ">-" || trimmed === "|" || trimmed === "|-") return "";
  return value;
}

function mapListed(record: LocalSkillRecord): UserSkill {
  return {
    skillId: record.skillId,
    skillName: record.name,
    description: sanitizeStoredDescription(record.description),
    enabled: record.enabled !== false,
    creatorType: "user",
    partitionBy: "account",
  };
}

let items: UserSkill[] = [];
const listeners = new Set<() => void>();
let hydratePromise: Promise<void> | null = null;

const filesBySkill = new Map<string, LocalSkillFile[]>();
const filesLoading = new Map<string, boolean>();
const filesEpoch = new Map<string, number>();
const filesInflight = new Map<string, Promise<LocalSkillFile[]>>();
const filesListeners = new Set<() => void>();
let filesRevision = 0;

function emit(): void {
  for (const listener of listeners) listener();
}

function emitFiles(): void {
  filesRevision += 1;
  for (const listener of filesListeners) listener();
}

function skillsBridge() {
  return desktopBridge.LocalAgentModeSessions;
}

export function getUserSkills(): UserSkill[] {
  return items;
}

export function subscribeUserSkills(listener: () => void): () => void {
  listeners.add(listener);
  void hydrateUserSkills();
  return () => {
    listeners.delete(listener);
  };
}

export function findUserSkill(skillId: string): UserSkill | undefined {
  return items.find((item) => item.skillId === skillId);
}

export type StoredUserSkill = UserSkill;

export function getUserSkillFiles(skillId: string): LocalSkillFile[] {
  return filesBySkill.get(skillId) ?? EMPTY_FILES;
}

/** Official YLe isLoading: pending with no files data yet (Fe skeleton). */
export function isUserSkillFilesLoading(skillId: string): boolean {
  return filesLoading.get(skillId) === true && !filesBySkill.has(skillId);
}

export function subscribeUserSkillFiles(listener: () => void): () => void {
  filesListeners.add(listener);
  return () => {
    filesListeners.delete(listener);
  };
}

export function getUserSkillFilesRevision(): number {
  return filesRevision;
}

export async function hydrateUserSkills(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const listed = (await skillsBridge().listLocalSkills?.()) ?? [];
      items = listed.map(mapListed);
      emit();
    } catch {
      items = [];
      emit();
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

/** Official ULe / QLe: invalidateQueries([OLe,"files",skillId]). */
export function invalidateUserSkillFiles(skillId: string): void {
  if (!skillId) return;
  filesBySkill.delete(skillId);
  filesInflight.delete(skillId);
  filesEpoch.set(skillId, (filesEpoch.get(skillId) ?? 0) + 1);
  filesLoading.set(skillId, true);
  emitFiles();
  void loadUserSkillFiles(skillId);
}

export async function loadUserSkillFiles(skillId: string): Promise<LocalSkillFile[]> {
  if (!skillId) return EMPTY_FILES;
  if (filesBySkill.has(skillId) && filesLoading.get(skillId) !== true) {
    return filesBySkill.get(skillId) ?? EMPTY_FILES;
  }
  const inflight = filesInflight.get(skillId);
  if (inflight) return inflight;
  const epoch = filesEpoch.get(skillId) ?? 0;
  filesLoading.set(skillId, true);
  emitFiles();
  const promise = (async () => {
    try {
      const files = (await skillsBridge().getLocalSkillFiles?.(skillId)) ?? [];
      if ((filesEpoch.get(skillId) ?? 0) !== epoch) {
        return filesBySkill.get(skillId) ?? EMPTY_FILES;
      }
      const next = Array.isArray(files) ? files : EMPTY_FILES;
      filesBySkill.set(skillId, next);
      return next;
    } catch {
      if ((filesEpoch.get(skillId) ?? 0) !== epoch) {
        return filesBySkill.get(skillId) ?? EMPTY_FILES;
      }
      filesBySkill.set(skillId, EMPTY_FILES);
      return EMPTY_FILES;
    } finally {
      if ((filesEpoch.get(skillId) ?? 0) === epoch) {
        filesLoading.set(skillId, false);
        filesInflight.delete(skillId);
        emitFiles();
      }
    }
  })();
  filesInflight.set(skillId, promise);
  return promise;
}

export async function upsertUserSkill(input: {
  description: string;
  instructions: string;
  skillId?: string;
  skillName: string;
}): Promise<UserSkill> {
  const skillName = input.skillName.trim();
  const existing =
    (input.skillId ? items.find((item) => item.skillId === input.skillId) : undefined) ??
    items.find((item) => item.skillName === skillName);
  const markdown = formatSkillMarkdown(skillName, input.description, input.instructions);
  const result = await skillsBridge().saveLocalSkill?.(
    skillName,
    input.description,
    markdown,
    Boolean(existing),
  );
  if (result && result.ok === false) {
    throw new Error(result.error ?? "Failed to save skill");
  }
  hydratePromise = null;
  await hydrateUserSkills();
  const saved =
    items.find((item) => item.skillId === skillName || item.skillName === skillName) ??
    mapListed({
      skillId: skillName,
      name: skillName,
      description: input.description,
      enabled: existing?.enabled !== false,
    });
  if (!items.some((item) => item.skillId === saved.skillId)) items = [...items, saved];
  emit();
  invalidateUserSkillFiles(saved.skillId);
  return saved;
}

/** Official Pe G / BLe: hT.setLocalSkillEnabled. */
export async function setUserSkillEnabled(skillId: string, enabled: boolean): Promise<void> {
  const result = await skillsBridge().setLocalSkillEnabled?.(skillId, enabled);
  if (result && result.ok === false) {
    throw new Error(result.error ?? "Failed to toggle skill");
  }
  items = items.map((item) => (item.skillId === skillId ? { ...item, enabled } : item));
  emit();
}

/** Official Te Uninstall / KLe: hT.deleteLocalSkill. */
export async function removeUserSkill(skillId: string): Promise<void> {
  const result = await skillsBridge().deleteLocalSkill?.(skillId);
  if (result && result.ok === false) {
    throw new Error(result.error ?? "Failed to delete skill");
  }
  items = items.filter((item) => item.skillId !== skillId);
  filesBySkill.delete(skillId);
  filesInflight.delete(skillId);
  filesLoading.delete(skillId);
  emit();
  emitFiles();
}

function instructionsFromFiles(files: LocalSkillFile[]): string {
  const skillMd = files.find(
    (file) => file.path === "SKILL.md" || file.path.endsWith("/SKILL.md"),
  ) ?? files[0];
  const content = skillMd?.content ?? "";
  if (!content) return "";
  const parsed = parseSkillMarkdown(content);
  return "error" in parsed ? content : parsed.instructions;
}

/** Official ce getLocalSkillFiles — SKILL.md body for Pe Fe preview / F edit. */
export async function loadUserSkillInstructions(skillId: string): Promise<string> {
  const files = await loadUserSkillFiles(skillId);
  return instructionsFromFiles(files);
}

export function resetUserSkillsStoreForTests(): void {
  items = [];
  hydratePromise = null;
  filesBySkill.clear();
  filesLoading.clear();
  filesEpoch.clear();
  filesInflight.clear();
  filesRevision = 0;
}
