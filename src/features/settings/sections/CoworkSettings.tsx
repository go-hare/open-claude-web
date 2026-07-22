import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CdsButton, SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

type CoworkMemoryBridge = {
  deleteAccountMemory?: (path: string) => Promise<boolean | void>;
  listAccountMemories?: () => Promise<unknown[] | null | undefined>;
  readAccountMemory?: (path: string) => Promise<string | null | undefined>;
  readGlobalMemory?: () => Promise<string | null | undefined>;
  resetMemories?: () => Promise<boolean | void>;
  writeAccountMemory?: (path: string, value: string) => Promise<boolean | void>;
  writeGlobalMemory?: (value: string) => Promise<boolean | void>;
};

type SessionsBridgeToggle = {
  getSessionsBridgeEnabled?: () => Promise<boolean | null | undefined>;
  setSessionsBridgeEnabled?: (enabled: boolean) => Promise<boolean | void>;
};

type MemoryFile = {
  content: string;
  path: string;
};

/**
 * Official CoworkPage tn (cc989143e):
 * title + Dispatch Ht (Xe.get/setSessionsBridgeEnabled) + Global instructions Xt
 * (X.read/writeGlobalMemory) + Auto-organize $t (te.coworkSpaceContextEnabled) + Memory Vt.
 * Memory toggle: account.settings.enabled_cowork_memory via mutate J().
 * Memory list: X.listAccountMemories / deleteAccountMemory (gt/xt/Yt).
 * Official English copy.
 */
export function CoworkSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const [dispatchEnabled, setDispatchEnabled] = useState<boolean | null>(null);
  const [dispatchPending, setDispatchPending] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsSaving, setInstructionsSaving] = useState(false);
  const [instructionsError, setInstructionsError] = useState("");
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [memoriesSupported, setMemoriesSupported] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  const [memoryTick, setMemoryTick] = useState(0);

  // Official Qt: !1 !== account.settings.enabled_cowork_memory
  const memoryEnabled = bootstrap.account?.settings?.enabled_cowork_memory !== false;

  useEffect(() => {
    let alive = true;
    const sessions = sessionsBridge();
    if (!sessions?.getSessionsBridgeEnabled) {
      // No bridge surface → leave Dispatch row hidden (official residual when Xe absent).
      setDispatchEnabled(null);
      return () => {
        alive = false;
      };
    }
    void sessions
      .getSessionsBridgeEnabled()
      .then((value) => {
        if (!alive) return;
        setDispatchEnabled(value !== false);
      })
      .catch(() => {
        if (!alive) return;
        setDispatchEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!editingInstructions) return;
    let alive = true;
    setInstructionsLoading(true);
    setInstructionsError("");
    void memoryBridge()
      ?.readGlobalMemory?.()
      .then((value) => {
        if (!alive) return;
        setInstructions(value ?? "");
      })
      .catch(() => {
        if (!alive) return;
        setInstructions("");
      })
      .finally(() => {
        if (alive) setInstructionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [editingInstructions]);

  useEffect(() => {
    let alive = true;
    // Official gt(): need list+read+write+delete AccountMemory on X (CoworkMemory).
    const memory = memoryBridge();
    const list = memory?.listAccountMemories;
    const read = memory?.readAccountMemory;
    const write = memory?.writeAccountMemory;
    const remove = memory?.deleteAccountMemory;
    if (!list || !read || !write || !remove) {
      setMemoriesSupported(false);
      setMemories([]);
      setMemoriesLoading(false);
      return () => {
        alive = false;
      };
    }
    setMemoriesSupported(true);
    setMemoriesLoading(true);
    void list()
      .then((raw) => {
        if (!alive) return;
        setMemories(normalizeMemoryList(raw));
      })
      .catch(() => {
        if (!alive) return;
        setMemories([]);
      })
      .finally(() => {
        if (alive) setMemoriesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [memoryTick]);

  const toggleDispatch = useCallback(async () => {
    if (dispatchPending || dispatchEnabled === null) return;
    const sessions = sessionsBridge();
    if (!sessions?.setSessionsBridgeEnabled) return;
    const previous = dispatchEnabled;
    const next = !previous;
    setDispatchPending(true);
    setDispatchEnabled(next);
    try {
      await sessions.setSessionsBridgeEnabled(next);
    } catch {
      setDispatchEnabled(previous);
    } finally {
      setDispatchPending(false);
    }
  }, [dispatchEnabled, dispatchPending]);

  const saveInstructions = useCallback(async () => {
    if (instructionsSaving) return;
    const memory = memoryBridge();
    if (!memory?.writeGlobalMemory) {
      setInstructionsError("Failed to save instructions. You can try again.");
      return;
    }
    setInstructionsSaving(true);
    setInstructionsError("");
    try {
      const ok = await memory.writeGlobalMemory(instructions);
      if (ok === false) throw new Error("write failed");
      setEditingInstructions(false);
    } catch {
      setInstructionsError("Failed to save instructions. You can try again.");
    } finally {
      setInstructionsSaving(false);
    }
  }, [instructions, instructionsSaving]);

  const deleteMemory = useCallback(async (path: string) => {
    setMemoryError("");
    const memory = memoryBridge();
    if (!memory?.deleteAccountMemory) {
      setMemoryError("Couldn’t delete this memory. Please try again.");
      return false;
    }
    try {
      const ok = await memory.deleteAccountMemory(path);
      if (ok === false) {
        setMemoryError("Couldn’t delete this memory. Please try again.");
        return false;
      }
      setMemoryTick((value) => value + 1);
      return true;
    } catch {
      setMemoryError("Couldn’t delete this memory. Please try again.");
      return false;
    }
  }, []);

  const toggleMemoryEnabled = useCallback(() => {
    void updateAccountSetting("enabled_cowork_memory", !memoryEnabled);
    // Keep legacy desktop pref in sync for any residual local consumers.
    setPreference("enabledCoworkMemory", !memoryEnabled);
  }, [memoryEnabled, setPreference, updateAccountSetting]);

  return (
    <main className="flex flex-col gap-7">
      <h1 className="text-heading-semibold text-primary">Cowork</h1>
      <SettingsSection>
        {dispatchEnabled !== null ? (
          <SettingsRow
            label={
              <span className="flex items-center gap-2">
                Dispatch{" "}
                <span className="inline-flex rounded-full bg-bg-300 px-2 py-0.5 text-footnote text-secondary">
                  Beta
                </span>
              </span>
            }
            description="Let Claude work on tasks from your phone using this computer. When off, your phone won't be able to dispatch work here."
            control={
              <Switch
                checked={dispatchEnabled}
                disabled={dispatchPending}
                onCheckedChange={() => {
                  void toggleDispatch();
                }}
              />
            }
          />
        ) : null}
        <SettingsRow
          label="Auto-organize sessions into projects"
          description="Claude groups related sessions into projects, surfaces the project's folders, and tells the session about its project on the next message."
          control={
            <Switch
              checked={!!preferences.coworkSpaceContextEnabled}
              onCheckedChange={(checked) => setPreference("coworkSpaceContextEnabled", checked)}
            />
          }
        />
        {editingInstructions ? (
          <div className="flex flex-col gap-3 py-md">
            <p className="text-sm text-text-500">
              Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or
              context that Claude should always know.
            </p>
            {instructionsLoading ? (
              <div className="flex h-64 items-center justify-center text-text-500">Loading...</div>
            ) : (
              <textarea
                aria-label="Global instructions"
                className="cds-input cds-reset h-64 resize-y rounded bg-fill-field px-sm py-sm font-mono text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
                placeholder="Add instructions for Claude to follow in all Cowork sessions..."
                spellCheck={false}
                value={instructions}
                onChange={(event) => setInstructions(event.currentTarget.value)}
              />
            )}
            {instructionsError ? <p className="text-footnote text-danger-000">{instructionsError}</p> : null}
            <div className="flex justify-end gap-2">
              <CdsButton
                onClick={() => {
                  setEditingInstructions(false);
                  setInstructionsError("");
                }}
              >
                Cancel
              </CdsButton>
              <CdsButton
                primary
                disabled={instructionsLoading || instructionsSaving}
                onClick={() => void saveInstructions()}
              >
                {instructionsSaving ? "Saving..." : "Save"}
              </CdsButton>
            </div>
          </div>
        ) : (
          <SettingsRow
            label="Global instructions"
            description="Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or context that Claude should always know."
            control={<CdsButton onClick={() => setEditingInstructions(true)}>Edit</CdsButton>}
          />
        )}
      </SettingsSection>
      {/* Official Vt: only when desktop product residual && memory bridge supported (r && o). */}
      {memoriesSupported ? (
        <SettingsSection title="Memory">
          <SettingsRow
            label="Use memory in sessions"
            description={
              memoryEnabled
                ? "Claude will read and update these memories during Cowork sessions."
                : "Paused. Existing memories are kept but won’t be read or updated in new sessions."
            }
            control={
              <Switch
                checked={memoryEnabled}
                onCheckedChange={() => {
                  toggleMemoryEnabled();
                }}
              />
            }
          />
          <p className="py-md text-footnote text-secondary">
            Claude saves what it learns about you and your work during Cowork sessions. These files are
            stored on this device.
          </p>
          {memories.length > 0 ? (
            <div className="flex flex-col">
              {memories.map((file) => (
                <MemoryRow key={file.path} file={file} onDelete={deleteMemory} />
              ))}
            </div>
          ) : memoriesLoading ? null : (
            <p className="py-md text-footnote text-secondary">
              No memories yet. Claude will add entries here as you work together.
            </p>
          )}
          {memoryError ? (
            <p className="py-sm text-footnote text-danger-000" role="status">
              {memoryError}
            </p>
          ) : null}
        </SettingsSection>
      ) : null}
    </main>
  );
}

function MemoryRow({
  file,
  onDelete,
}: {
  file: MemoryFile;
  onDelete: (path: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bodyId = useId();
  const parsed = useMemo(() => parseMemoryFrontmatter(file.content ?? ""), [file.content]);
  const title = useMemo(() => memoryDisplayName(file, parsed.name), [file, parsed.name]);

  return (
    <div className="flex items-start justify-between gap-lg py-md">
      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={expanded ? bodyId : undefined}
          className="rounded text-left text-body text-primary hover:text-text-000 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-100"
        >
          {title}
        </button>
        {parsed.description ? (
          <p className="text-footnote text-secondary">{parsed.description}</p>
        ) : null}
        {expanded ? (
          <pre
            id={bodyId}
            className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-200 p-3 text-xs text-text-200"
          >
            {parsed.body}
          </pre>
        ) : null}
      </div>
      <CdsButton
        disabled={deleting}
        onClick={() => {
          void (async () => {
            setDeleting(true);
            try {
              await onDelete(file.path);
            } finally {
              setDeleting(false);
            }
          })();
        }}
        aria-label={`Delete memory ${title}`}
      >
        Delete
      </CdsButton>
    </div>
  );
}

function parseMemoryFrontmatter(content: string): {
  body: string;
  description?: string;
  name?: string;
  type?: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { body: content };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^(\w+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    meta[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "");
  }
  return {
    name: meta.name || undefined,
    description: meta.description || undefined,
    type: meta.type || undefined,
    body: content.slice(match[0].length),
  };
}

function memoryDisplayName(file: MemoryFile, frontmatterName?: string): string {
  if (frontmatterName) return humanizeToken(frontmatterName);
  return humanizeToken(file.path.replace(/\.md$/, "").replace(/[_-]/g, " "));
}

function humanizeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Memory";
  return trimmed
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function normalizeMemoryList(raw: unknown): MemoryFile[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const path =
      typeof rec.path === "string"
        ? rec.path
        : typeof rec.key === "string"
          ? rec.key
          : null;
    if (!path) continue;
    const content =
      typeof rec.content === "string"
        ? rec.content
        : typeof rec.value === "string"
          ? rec.value
          : "";
    out.push({ path, content });
  }
  return out;
}

function sessionsBridge(): SessionsBridgeToggle | undefined {
  const web = window["claude.web"] as
    | {
        LocalAgentModeSessions?: SessionsBridgeToggle;
        LocalSessions?: SessionsBridgeToggle;
      }
    | undefined;
  return web?.LocalAgentModeSessions ?? web?.LocalSessions;
}

function memoryBridge(): CoworkMemoryBridge | undefined {
  const web = window["claude.web"] as { CoworkMemory?: CoworkMemoryBridge } | undefined;
  return web?.CoworkMemory;
}
