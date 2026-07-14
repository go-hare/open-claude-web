import { useState } from "react";
import { CdsButton, SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { useDesktopPreferences } from "../useDesktopPreferences";

/**
 * Official CoworkPage tn (cc989143e):
 * title + Dispatch Ht + Global instructions Jt + Auto-organize $t + optional redemptions + Memory Vt.
 */
export function CoworkSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const [dispatchEnabled, setDispatchEnabled] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(false);
  return (
    <main className="flex flex-col gap-7">
      <h1 className="text-heading-semibold text-primary">Cowork</h1>
      <SettingsSection>
        <SettingsRow
          label={<span className="flex items-center gap-2">Dispatch <span className="inline-flex rounded-full bg-bg-300 px-2 py-0.5 text-footnote text-secondary">Beta</span></span>}
          description="Let Claude work on tasks from your phone using this computer. When off, your phone won't be able to dispatch work here."
          control={<Switch checked={dispatchEnabled} onCheckedChange={setDispatchEnabled} />}
        />
        <SettingsRow
          label="Auto-organize sessions into projects"
          description="Claude groups related sessions into projects, surfaces the project's folders, and tells the session about its project on the next message."
          control={<Switch checked={!!preferences.coworkSpaceContextEnabled} onCheckedChange={(checked) => setPreference("coworkSpaceContextEnabled", checked)} />}
        />
        {editingInstructions ? (
          <div className="flex flex-col gap-3 py-md">
            <p className="text-text-500 text-sm">这里的说明会应用到所有协作会话。适合填写 Claude 应始终知道的偏好、约定或上下文。</p>
            <textarea
              aria-label="全局说明"
              className="cds-input cds-reset h-64 resize-y rounded bg-fill-field px-sm py-sm font-mono text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
              placeholder="Add instructions for Claude to follow in all Cowork sessions..."
              spellCheck={false}
            />
            <div className="flex justify-end gap-2">
              <CdsButton onClick={() => setEditingInstructions(false)}>Cancel</CdsButton>
              <CdsButton primary onClick={() => setEditingInstructions(false)}>Save</CdsButton>
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
          description={preferences.enabledCoworkMemory === false ? "Paused. Existing memories are kept but won’t be read or updated in new sessions." : "Claude will read and update these memories during Cowork sessions."}
          control={<Switch checked={preferences.enabledCoworkMemory !== false} onCheckedChange={(checked) => setPreference("enabledCoworkMemory", checked)} />}
        />
        <p className="py-md text-footnote text-secondary">Claude 会在协作会话中保存它对你和你工作的了解。这些文件会存储在当前设备上。</p>
        <p className="py-md text-footnote text-secondary">目前还没有记忆。Claude 会在你协作的过程中逐步在这里添加内容。</p>
      </SettingsSection>
    </main>
  );
}
