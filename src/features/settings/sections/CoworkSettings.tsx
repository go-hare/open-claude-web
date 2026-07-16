import { useCallback, useEffect, useState } from "react";
import { CdsButton, SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { useDesktopPreferences } from "../useDesktopPreferences";

type CoworkMemoryBridge = {
  readGlobalMemory?: () => Promise<string | null | undefined>;
  writeGlobalMemory?: (value: string) => Promise<boolean | void>;
};

type SessionsBridgeToggle = {
  getSessionsBridgeEnabled?: () => Promise<boolean | null | undefined>;
  setSessionsBridgeEnabled?: (enabled: boolean) => Promise<boolean | void>;
};

/**
 * Official CoworkPage tn (cc989143e):
 * title + Dispatch Ht (Xe.get/setSessionsBridgeEnabled) + Global instructions Xt
 * (X.read/writeGlobalMemory) + Auto-organize $t (te.coworkSpaceContextEnabled) + Memory Vt.
 */
export function CoworkSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const [dispatchEnabled, setDispatchEnabled] = useState<boolean | null>(null);
  const [dispatchPending, setDispatchPending] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsSaving, setInstructionsSaving] = useState(false);
  const [instructionsError, setInstructionsError] = useState("");

  useEffect(() => {
    let alive = true;
    const sessions = sessionsBridge();
    void sessions?.getSessionsBridgeEnabled?.()
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

  return (
    <main className="flex flex-col gap-7">
      <h1 className="text-heading-semibold text-primary">Cowork</h1>
      <SettingsSection>
        {dispatchEnabled !== null ? (
          <SettingsRow
            label={
              <span className="flex items-center gap-2">
                Dispatch{" "}
                <span className="inline-flex rounded-full bg-bg-300 px-2 py-0.5 text-footnote text-secondary">Beta</span>
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
            <p className="text-text-500 text-sm">
              这里的说明会应用到所有协作会话。适合填写 Claude 应始终知道的偏好、约定或上下文。
            </p>
            {instructionsLoading ? (
              <div className="flex h-64 items-center justify-center text-text-500">Loading...</div>
            ) : (
              <textarea
                aria-label="全局说明"
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
              <CdsButton primary disabled={instructionsLoading || instructionsSaving} onClick={() => void saveInstructions()}>
                {instructionsSaving ? "Saving..." : "Save"}
              </CdsButton>
            </div>
          </div>
        ) : (
          <SettingsRow
            label="全局说明"
            description="这里的说明会应用到所有协作会话。适合填写 Claude 应始终知道的偏好、约定或上下文。"
            control={<CdsButton onClick={() => setEditingInstructions(true)}>Edit</CdsButton>}
          />
        )}
      </SettingsSection>
      <SettingsSection title="记忆">
        <SettingsRow
          label="在会话中使用记忆"
          description={
            preferences.enabledCoworkMemory === false
              ? "Paused. Existing memories are kept but won’t be read or updated in new sessions."
              : "Claude will read and update these memories during Cowork sessions."
          }
          control={
            <Switch
              checked={preferences.enabledCoworkMemory !== false}
              onCheckedChange={(checked) => setPreference("enabledCoworkMemory", checked)}
            />
          }
        />
        <p className="py-md text-footnote text-secondary">
          Claude 会在协作会话中保存它对你和你工作的了解。这些文件会存储在当前设备上。
        </p>
        <p className="py-md text-footnote text-secondary">
          目前还没有记忆。Claude 会在你协作的过程中逐步在这里添加内容。
        </p>
      </SettingsSection>
    </main>
  );
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
