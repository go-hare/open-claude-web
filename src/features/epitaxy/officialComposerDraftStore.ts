/**
 * Official composer draft persist (index-BELz `SYt`/`OYt`/`PYt`/`DYt`/`zYt`,
 * c119 `wr`/`Mr`/`zo`).
 *
 *   SYt = "composer-draft:"
 *   OYt(key, {text, files, agent, stagedImages})
 *     IYt.has → no-op (zYt freeze)
 *     localStorage JSON {text, files, agent} when any of those is truthy
 *     else removeItem
 *     RAM EYt cap 20 (evict oldest key + its localStorage)
 *   PYt(key) = EYt || JSON.parse(localStorage)
 *   DYt(key, patch) = bump AYt generation then OYt
 *   LYt/jr = AYt.get ?? 0 — persist flush no-ops when generation moved
 *
 * Pin images (`NYt` / `kr` IDB) are not productized — do not invent IDB restore.
 * Do not invent an agent string; persist only a real `.agent` when one exists.
 */
import { useCallback, useEffect, useRef } from "react";
import type { StagedComposerFileAttachment } from "./session/officialComposerFileAttachments";

export const OFFICIAL_COMPOSER_DRAFT_PREFIX = "composer-draft:";
export const OFFICIAL_LANDING_COMPOSER_DRAFT_KEY = "epitaxy-draft";
export const OFFICIAL_COMPOSER_DRAFT_FLUSH_MS = 400;
const RAM_CAP = 20;

export type OfficialComposerDraft = {
  agent?: string;
  files?: StagedComposerFileAttachment[];
  text?: string;
};

const ram = new Map<string, OfficialComposerDraft>();
const generation = new Map<string, number>();
const frozen = new Set<string>();

function browserStorage(): Storage | null {
  try {
    const g = globalThis as { localStorage?: Storage };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function storageKey(persistKey: string): string {
  return `${OFFICIAL_COMPOSER_DRAFT_PREFIX}${persistKey}`;
}

function hasPersistableContent(draft: OfficialComposerDraft): boolean {
  return Boolean(draft.text || draft.files?.length || draft.agent);
}

function parseFiles(value: unknown): StagedComposerFileAttachment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: StagedComposerFileAttachment[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.fileName !== "string" || typeof rec.relativePath !== "string") {
      continue;
    }
    out.push({
      fileName: rec.fileName,
      id: rec.id,
      isDirectory: rec.isDirectory === true,
      relativePath: rec.relativePath,
    });
  }
  return out;
}

function parseDraft(raw: string | null): OfficialComposerDraft | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const rec = parsed as Record<string, unknown>;
    const draft: OfficialComposerDraft = {};
    if (typeof rec.text === "string") draft.text = rec.text;
    if (typeof rec.agent === "string") draft.agent = rec.agent;
    const files = parseFiles(rec.files);
    if (files) draft.files = files;
    return draft;
  } catch {
    return undefined;
  }
}

function evictOldestRamKey() {
  const oldest = ram.keys().next().value;
  if (oldest === undefined) return;
  ram.delete(oldest);
  try {
    browserStorage()?.removeItem(storageKey(oldest));
  } catch {
    /* quota */
  }
}

/** Official LYt / c119 `jr`. */
export function getComposerDraftGeneration(persistKey: string): number {
  return generation.get(persistKey) ?? 0;
}

/** Official PYt / c119 `wr`. */
export function readComposerDraft(persistKey: string | undefined): OfficialComposerDraft | undefined {
  if (!persistKey) return undefined;
  const cached = ram.get(persistKey);
  if (cached) return cached;
  const ls = browserStorage();
  if (!ls) return undefined;
  try {
    const parsed = parseDraft(ls.getItem(storageKey(persistKey)));
    if (parsed) ram.set(persistKey, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

/** Official eI chip seed: `l ?? wr(a)?.agent`. Falsy → hide chip. */
export function readComposerDraftAgent(persistKey: string | undefined): string | undefined {
  const agent = readComposerDraft(persistKey)?.agent;
  return typeof agent === "string" && agent.trim() ? agent : undefined;
}

/**
 * Official OYt / c119 `Mr`.
 * Frozen keys (`zYt` / IYt) no-op. Empty content removeItem.
 */
export function writeComposerDraft(persistKey: string, draft: OfficialComposerDraft): void {
  if (frozen.has(persistKey)) return;
  const next: OfficialComposerDraft = {
    agent: draft.agent,
    files: draft.files,
    text: draft.text,
  };
  const ls = browserStorage();
  const key = storageKey(persistKey);
  if (hasPersistableContent(next)) {
    try {
      ls?.setItem(key, JSON.stringify({ text: next.text, files: next.files, agent: next.agent }));
    } catch {
      /* quota */
    }
    ram.delete(persistKey);
    if (ram.size >= RAM_CAP) evictOldestRamKey();
    ram.set(persistKey, next);
    return;
  }
  try {
    ls?.removeItem(key);
  } catch {
    /* ignore */
  }
  ram.delete(persistKey);
}

/**
 * Official DYt / c119 `zo`.
 * Bumps generation so in-flight 400ms / unmount flushes no-op, then OYt.
 */
export function persistComposerDraft(persistKey: string, draft: OfficialComposerDraft = {}): void {
  generation.set(persistKey, (generation.get(persistKey) ?? 0) + 1);
  writeComposerDraft(persistKey, draft);
}

/**
 * Official zYt — freeze + bump + wipe. Pin never unfreezes IYt.
 * Product reset-draft uses persistComposerDraft(key, {}) (zo), not this.
 */
export function freezeComposerDraft(persistKey: string): void {
  frozen.add(persistKey);
  generation.set(persistKey, (generation.get(persistKey) ?? 0) + 1);
  ram.delete(persistKey);
  try {
    browserStorage()?.removeItem(storageKey(persistKey));
  } catch {
    /* ignore */
  }
}

export function resetOfficialComposerDraftStateForTests(): void {
  ram.clear();
  generation.clear();
  frozen.clear();
}

/**
 * Official same-instance persistKey change (c119 `w`/`t`):
 *   landing `epitaxy-draft` → session: `Mr(old,{stagedImages:[]})` wipes uE
 *   (official A→B remounts vI so this does not fire across sessions)
 *
 * Product keeps EpitaxyChatPanel mounted on A→B — flush the previous
 * session key instead of wiping it. Do not copy a stale agent onto the new key.
 */
export function commitComposerDraftOnPersistKeyChange(
  prevKey: string | undefined,
  nextKey: string | undefined,
  prevDraft: OfficialComposerDraft,
  prevGen: number,
): void {
  if (!prevKey || prevKey === nextKey) return;
  if (prevKey === OFFICIAL_LANDING_COMPOSER_DRAFT_KEY) {
    writeComposerDraft(prevKey, {});
    return;
  }
  if (getComposerDraftGeneration(prevKey) === prevGen) {
    writeComposerDraft(prevKey, prevDraft);
  }
}

/**
 * Official cn persist IIFE (c119):
 *   debounce 400ms on text/files/agent
 *   pagehide + unmount flush via Mr (OYt)
 *   persistKey change: landing wipe; session A→B flush prev (product same-panel)
 *   flush no-ops when jr(key) !== snapshot generation
 *
 * Images stay off this path (NYt IDB invent wall).
 */
export function useOfficialComposerDraftPersist({
  agent,
  files,
  getText,
  persistKey,
  text,
}: {
  agent?: string;
  files: StagedComposerFileAttachment[];
  getText?: () => string;
  persistKey: string | undefined;
  text: string;
}): void {
  const keyRef = useRef(persistKey);
  const genRef = useRef(persistKey ? getComposerDraftGeneration(persistKey) : 0);
  const payloadRef = useRef({ agent, files, getText, text });
  if (keyRef.current === persistKey) {
    payloadRef.current = { agent, files, getText, text };
  }

  const flush = useCallback(() => {
    const key = keyRef.current;
    if (!key) return;
    if (getComposerDraftGeneration(key) !== genRef.current) return;
    const payload = payloadRef.current;
    writeComposerDraft(key, {
      agent: payload.agent,
      files: payload.files,
      text: payload.getText?.() ?? payload.text,
    });
  }, []);

  useEffect(() => {
    if (!persistKey) return undefined;
    const timer = window.setTimeout(() => {
      flush();
    }, OFFICIAL_COMPOSER_DRAFT_FLUSH_MS);
    return () => window.clearTimeout(timer);
  }, [agent, files, flush, persistKey, text]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

  // Official persistKey effect is `[t]` only. Product A→B is the same panel:
  // flush the previous session key (or wipe landing), then bind the new key.
  useEffect(() => {
    if (keyRef.current === persistKey) return;
    const prev = keyRef.current;
    const payload = payloadRef.current;
    // Same-panel A→B: layout restore already rewrote TipTap to wr(B).
    // Official remounts vI so unmount flush still sees A. Product must
    // snapshot payloadRef from the last matching persistKey — never getText().
    commitComposerDraftOnPersistKeyChange(prev, persistKey, {
      agent: payload.agent,
      files: payload.files,
      text: payload.text,
    }, genRef.current);
    keyRef.current = persistKey;
    genRef.current = persistKey ? getComposerDraftGeneration(persistKey) : 0;
    // Same-panel A→B: React text/files are still the previous session this tick.
    // Bind wr(newKey) so the 400ms flush cannot copy A onto B. Editor getText
    // is also still A until the restore layout effect.
    const restored = persistKey ? readComposerDraft(persistKey) : undefined;
    payloadRef.current = {
      agent: restored?.agent,
      files: restored?.files ?? [],
      getText: undefined,
      text: restored?.text ?? "",
    };
    // persistKey-only: official `[t]`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  useEffect(() => () => {
    flush();
  }, [flush]);
}
