import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CdsButton, SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import {
  formatDeleteMemoryLabel,
  useCoworkSettingsText,
} from "../settingsMessages";
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

type MemoryFile = {
  content: string;
  path: string;
};

/**
 * Official CoworkPage tn (cc989143e):
 * title + Dispatch Ht + Global instructions Xt + Auto-organize $t + Memory Vt.
 *
 * Product 2026-07-28: **Dispatch row hidden** (user: 派发隐藏吧) — bridge handlers
 * remain for residual/API; UI does not surface phone-dispatch until full parity.
 * Global/Memory use desktop CoworkMemory on-disk residual (CLAUDE.md + memory/*.md).
 * Auto-organize: te.coworkSpaceContextEnabled preference residual.
 * Memory toggle: account.settings.enabled_cowork_memory via mutate J().
 */
export function CoworkSettings() {
  const text = useCoworkSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
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

  const saveInstructions = useCallback(async () => {
    if (instructionsSaving) return;
    const memory = memoryBridge();
    if (!memory?.writeGlobalMemory) {
      setInstructionsError(text.failedToSaveInstructions);
      return;
    }
    setInstructionsSaving(true);
    setInstructionsError("");
    try {
      const ok = await memory.writeGlobalMemory(instructions);
      if (ok === false) throw new Error("write failed");
      setEditingInstructions(false);
    } catch {
      setInstructionsError(text.failedToSaveInstructions);
    } finally {
      setInstructionsSaving(false);
    }
  }, [instructions, instructionsSaving, text.failedToSaveInstructions]);

  const deleteMemory = useCallback(async (path: string) => {
    setMemoryError("");
    const memory = memoryBridge();
    if (!memory?.deleteAccountMemory) {
      setMemoryError(text.couldntDeleteMemory);
      return false;
    }
    try {
      const ok = await memory.deleteAccountMemory(path);
      if (ok === false) {
        setMemoryError(text.couldntDeleteMemory);
        return false;
      }
      setMemoryTick((value) => value + 1);
      return true;
    } catch {
      setMemoryError(text.couldntDeleteMemory);
      return false;
    }
  }, [text.couldntDeleteMemory]);

  const toggleMemoryEnabled = useCallback(() => {
    // Official Qt: mutate account.settings.enabled_cowork_memory only (J()).
    void updateAccountSetting("enabled_cowork_memory", !memoryEnabled);
  }, [memoryEnabled, updateAccountSetting]);

  return (
    <main className="flex flex-col gap-7">
      <h1 className="text-heading-semibold text-primary">{text.cowork}</h1>
      <SettingsSection>
        {/* Dispatch Ht intentionally not rendered — user 派发隐藏吧 (2026-07-28). */}
        <SettingsRow
          label={text.autoOrganizeSessions}
          description={text.autoOrganizeSessionsDescription}
          control={
            <Switch
              checked={!!preferences.coworkSpaceContextEnabled}
              onCheckedChange={(checked) => setPreference("coworkSpaceContextEnabled", checked)}
            />
          }
        />
        {editingInstructions ? (
          <div className="flex flex-col gap-3 py-md">
            <p className="text-sm text-text-500">{text.globalInstructionsDescription}</p>
            {instructionsLoading ? (
              <div className="flex h-64 items-center justify-center text-text-500">{text.loading}</div>
            ) : (
              <textarea
                aria-label={text.globalInstructions}
                className="cds-input cds-reset h-64 resize-y rounded bg-fill-field px-sm py-sm font-mono text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
                placeholder={text.globalInstructionsPlaceholder}
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
                {text.cancel}
              </CdsButton>
              <CdsButton
                primary
                disabled={instructionsLoading || instructionsSaving}
                onClick={() => void saveInstructions()}
              >
                {instructionsSaving ? text.saving : text.save}
              </CdsButton>
            </div>
          </div>
        ) : (
          <SettingsRow
            label={text.globalInstructions}
            description={text.globalInstructionsDescription}
            control={<CdsButton onClick={() => setEditingInstructions(true)}>{text.edit}</CdsButton>}
          />
        )}
      </SettingsSection>
      {/* Official Vt: only when desktop product residual && memory bridge supported (r && o). */}
      {memoriesSupported ? (
        <SettingsSection title={text.memory}>
          <SettingsRow
            label={text.useMemoryInSessions}
            description={memoryEnabled ? text.useMemoryInSessionsOn : text.useMemoryInSessionsOff}
            control={
              <Switch
                checked={memoryEnabled}
                onCheckedChange={() => {
                  toggleMemoryEnabled();
                }}
              />
            }
          />
          <p className="py-md text-footnote text-secondary">{text.memoryStorageBlurb}</p>
          {memories.length > 0 ? (
            <div className="flex flex-col">
              {memories.map((file) => (
                <MemoryRow
                  key={file.path}
                  deleteLabel={text.delete}
                  deleteNamedTemplate={text.deleteMemoryNamed}
                  file={file}
                  onDelete={deleteMemory}
                />
              ))}
            </div>
          ) : memoriesLoading ? null : (
            <p className="py-md text-footnote text-secondary">{text.noMemoriesYet}</p>
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
  deleteLabel,
  deleteNamedTemplate,
  file,
  onDelete,
}: {
  deleteLabel: string;
  deleteNamedTemplate: string;
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
        aria-label={formatDeleteMemoryLabel(deleteNamedTemplate, title)}
      >
        {deleteLabel}
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

function memoryBridge(): CoworkMemoryBridge | undefined {
  const web = window["claude.web"] as { CoworkMemory?: CoworkMemoryBridge } | undefined;
  return web?.CoworkMemory;
}
