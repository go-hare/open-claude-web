import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { desktopBridge, type DesktopPreferences } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { BaseMenuItem, BaseMenuPopup, Menu } from "../../shell/BaseMenu";
import { Icon } from "../../shell/icons";
import {
  CdsButton,
  PersonalSettingsLayout,
  SettingsRow,
  SettingsSection,
  Switch,
  type NavGroup,
  sectionBodyClass,
  secondaryButtonClass,
} from "./SettingsShell";

export const PERSONAL_SETTINGS_GROUPS: NavGroup[] = [
  { sections: [
    { id: "general", href: "/settings/general", label: "通用" },
    { id: "data-privacy-controls", href: "/settings/data-privacy-controls", label: "隐私" },
    { id: "capabilities", href: "/settings/capabilities", label: "功能" },
    { id: "connectors", href: "/settings/connectors", label: "连接器" },
    { id: "claude-code", href: "/settings/claude-code", label: "Claude Code" },
    { id: "cowork", href: "/settings/cowork", label: "Cowork" },
  ] },
  { title: "桌面应用", sections: [
    { id: "desktop", href: "/settings/desktop", label: "通用", exactMatch: true },
    { id: "desktop/extensions", href: "/settings/desktop/extensions", label: "扩展" },
    { id: "desktop/developer", href: "/settings/desktop/developer", label: "开发者" },
  ] },
  { title: "Workbench Org", sections: [{ id: "admin-organization", href: "/admin-settings/organization", label: "Organization settings" }] },
];

const defaultPreferences: DesktopPreferences = {
  autoCreatePullRequests: false,
  autoUpdateExtensions: true,
  bypassPermissionsModeEnabled: false,
  ccBranchPrefix: "claude",
  chillingSlothLocation: "default",
  coworkSpaceContextEnabled: false,
  dockBounceEnabled: false,
  enabledCoworkMemory: true,
  keepAwakeEnabled: false,
  launchEnabled: false,
  launchPreviewPersistSession: false,
  menuBarEnabled: true,
  quickEntryShortcut: "",
  useBuiltInNodeForMcp: true,
};

export function PersonalSettingsPage({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  return (
    <PersonalSettingsLayout groups={PERSONAL_SETTINGS_GROUPS} onNavigate={onNavigate} pathname={pathname}>
      {renderPersonalContent(pathname, onNavigate)}
    </PersonalSettingsLayout>
  );
}

function renderPersonalContent(pathname: string, onNavigate: RouteViewProps["onNavigate"]) {
  if (pathname === "/settings" || pathname === "/settings/general") return <GeneralSettings />;
  if (pathname === "/settings/data-privacy-controls") return <PrivacySettings />;
  if (pathname === "/settings/capabilities") return <CapabilitiesSettings />;
  if (pathname === "/settings/connectors") return <ConnectorsSettings />;
  if (pathname === "/settings/claude-code") return <ClaudeCodeSettings />;
  if (pathname === "/settings/cowork") return <CoworkSettings />;
  if (pathname === "/settings/desktop") return <DesktopSettings />;
  if (pathname === "/settings/desktop/extensions") return <ExtensionsOverview onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/advanced") return <ExtensionsAdvanced onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/manage-directory") return <ExtensionsDirectory onNavigate={onNavigate} />;
  if (pathname.startsWith("/settings/desktop/extensions/")) return <ExtensionNotFound onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/developer") return <DesktopDeveloper />;
  return <p>Not Found</p>;
}

function useDesktopPreferences() {
  const [preferences, setPreferences] = useState<DesktopPreferences>(defaultPreferences);

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getPreferences?.().then((loaded) => {
      if (alive && loaded) setPreferences({ ...defaultPreferences, ...loaded });
    });
    const unsubscribe = desktopBridge.Preferences.onPreferencesChanged?.((next) => {
      setPreferences({ ...defaultPreferences, ...next });
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const setPreference = useCallback(<K extends keyof DesktopPreferences>(key: K, value: DesktopPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    void desktopBridge.Preferences.setPreference?.(key, value);
  }, []);

  return [preferences, setPreference] as const;
}

function GeneralSettings() {
  const [avatar, setAvatar] = useState(0);
  const [appearance, setAppearance] = useState<"auto" | "light" | "dark">("auto");
  const [chatFont, setChatFont] = useState("default");
  const [workFunction, setWorkFunction] = useState("");
  const [codeNotifications, setCodeNotifications] = useState(false);
  const [codePermissionRequests, setCodePermissionRequests] = useState(false);
  const [securityScanEmails, setSecurityScanEmails] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState(false);

  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title="个人资料">
        <SettingsRow
          label="头像"
          control={<AvatarControl avatar={avatar} onRandomize={() => setAvatar(Math.floor(72 * Math.random()) + 1)} onClear={() => setAvatar(0)} />}
        />
        <SettingsRow label="全名" control={<TextInputControl ariaLabel="全名" defaultValue="Cowork 3P" />} />
        <SettingsRow label="Claude 应该怎么称呼你？" control={<TextInputControl ariaLabel="显示名称" defaultValue="Cowork 3P" />} />
        <SettingsRow
          label="哪项最符合你的工作？"
          control={
            <GhostSelect
              align="end"
              placeholder="选择"
              value={workFunction}
              options={[
                { value: "engineering", label: "工程" },
                { value: "product", label: "产品" },
                { value: "design", label: "设计" },
                { value: "operations", label: "运营" },
                { value: "other", label: "其他" },
              ]}
              onChange={setWorkFunction}
            />
          }
        />
        <div className="flex flex-col gap-sm py-md">
          <label className="text-body text-primary" htmlFor="conversation-preferences">给 Claude 的说明</label>
          <div className="text-footnote text-neutral-500">
            Claude 会在聊天和协作中参考这些内容，前提是它们符合 Anthropic 的使用准则。了解更多
          </div>
          <textarea
            id="conversation-preferences"
            className="cds-input cds-reset min-h-[5.5rem] max-h-40 w-full resize-y rounded bg-fill-field px-sm py-sm text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
            placeholder="例如：解释尽量简洁直接"
            rows={3}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="偏好设置">
        <SettingsRow
          label="外观"
          control={
            <SegmentedControl
              ariaLabel="外观"
              value={appearance}
              options={[
                { value: "auto", label: "跟随系统", icon: "Computer" },
                { value: "light", label: "浅色", icon: "Sun" },
                { value: "dark", label: "深色", icon: "Moon" },
              ]}
              onChange={(value) => setAppearance(value as typeof appearance)}
            />
          }
        />
        <SettingsRow
          label="聊天字体"
          control={
            <GhostSelect
              align="end"
              value={chatFont}
              options={[
                { value: "default", label: "Anthropic Serif", fontFamily: "var(--font-serif)" },
                { value: "sans", label: "Anthropic Sans", fontFamily: "var(--font-ui)" },
                { value: "system", label: "跟随系统", fontFamily: "var(--font-system)" },
                { value: "dyslexia", label: "Dyslexic friendly", fontFamily: "var(--font-dyslexia)" },
              ]}
              onChange={setChatFont}
            />
          }
        />
      </SettingsSection>
      <SettingsSection title="通知">
        <SettingsRow
          label="代码通知"
          description="Claude can choose to notify you about important updates from a Code session."
          control={<Switch checked={codeNotifications} onCheckedChange={setCodeNotifications} />}
        />
        <SettingsRow
          label="Code permission requests"
          description="当 Claude 在 Code 会话中需要你批准运行命令时，向你发送推送通知。"
          control={<Switch checked={codePermissionRequests} onCheckedChange={setCodePermissionRequests} />}
        />
        <SettingsRow
          label="Security scan emails"
          description="Get an email when a Claude Code security scan finishes."
          control={<Switch checked={securityScanEmails} onCheckedChange={setSecurityScanEmails} />}
        />
        <SettingsRow
          label="Dispatch messages"
          description="当 Claude 在 Dispatch 中给你发消息时，向你的手机发送推送通知。"
          control={<Switch checked={dispatchMessages} onCheckedChange={setDispatchMessages} />}
        />
      </SettingsSection>
    </main>
  );
}


function PrivacySettings() {
  return (
    <main className="flex flex-col pb-10">
      <div className="pb-xl">
        <div className="flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring">
          <p className="pb-md text-footnote">
            你当前正通过组织自己的推理提供方（Gateway）使用 Claude。你的对话会发送到该提供方，而不是 Anthropic，并受你组织与该提供方协议的约束。
          </p>
          <div className="border-t border-alpha-1 pt-sm">
            <div className="flex flex-col gap-md pt-xs">
              <div>
                <p className="text-body text-primary">Anthropic 看不到的内容</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li><p className="text-body text-primary">你的提示词、Claude 的回复，以及任何对话内容</p></li>
                  <li><p className="text-body text-primary">你的文件、代码或工作区内容</p></li>
                  <li><p className="text-body text-primary">你的身份信息或账户详情</p></li>
                </ul>
              </div>
              <div>
                <p className="text-body text-primary">Anthropic 可能会接收到的内容（由你的组织配置）</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li><p className="text-body text-primary">崩溃报告与错误诊断信息，便于我们修复问题</p></li>
                  <li><p className="text-body text-primary">匿名使用指标，包括使用次数（不含对话内容）</p></li>
                  <li><p className="text-body text-primary">更新检查请求，用于让应用保持最新</p></li>
                  <li><p className="text-body text-primary">诊断报告，但仅在你明确选择“发送给 Anthropic”时才会发送</p></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CoworkSettings() {
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

function AvatarControl({ avatar, onClear, onRandomize }: { avatar: number; onClear: () => void; onRandomize: () => void }) {
  return (
    <div className="group/avatar relative w-fit">
      <button
        type="button"
        className="relative block overflow-hidden rounded-full outline-none focus-visible:shadow-focus"
        aria-label="随机头像"
        onClick={onRandomize}
      >
        <span className="block transition duration-fast group-hover/avatar:opacity-40 group-hover/avatar:blur-[3px] group-hover/avatar:scale-[1.15] group-has-[:focus-visible]/avatar:opacity-40 group-has-[:focus-visible]/avatar:blur-[3px] group-has-[:focus-visible]/avatar:scale-[1.15]">
          <span className="grid size-10 place-items-center rounded-full bg-bg-300 text-body text-primary">
            {avatar ? avatar : "C"}
          </span>
        </span>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity duration-fast group-hover/avatar:opacity-100 group-has-[:focus-visible]/avatar:opacity-100">
          <Icon name="Shuffle" size="md" className="text-secondary" />
        </div>
      </button>
      {avatar !== 0 ? (
        <div className="absolute -top-1.5 -left-1.5 opacity-0 transition-opacity duration-fast group-hover/avatar:opacity-100 group-has-[:focus-visible]/avatar:opacity-100">
          <button
            type="button"
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface-popover ring-1 ring-alpha-2 outline-none transition-colors duration-fast hover:bg-fill-ghost-hover focus-visible:shadow-focus"
            aria-label="清除头像"
            onClick={onClear}
          >
            <Icon name="X" customSize={12} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TextInputControl({ ariaLabel, defaultValue = "" }: { ariaLabel: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <input
      aria-label={ariaLabel}
      className="cds-input cds-reset h-control pl-sm rounded bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring data-[invalid]:shadow-field-invalid text-body text-primary transition duration-fast pr-sm w-56 placeholder:text-muted outline-none enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover focus-visible:shadow-focus disabled:opacity-50 "
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
    />
  );
}

function SegmentedControl({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: Array<{ value: string; label: string; icon?: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      aria-label={ariaLabel}
      className="relative inline-flex w-fit items-stretch h-control rounded bg-segment-track p-px"
      data-cds="SegmentedControl"
      role="radiogroup"
    >
      <div
        aria-hidden="true"
        className="absolute rounded-[calc(var(--cds-radius)-1px)] bg-segment-thumb transition-[left,width] duration-base ease-snap motion-reduce:transition-none top-px bottom-px [box-shadow:inset_0_0_0_1px_var(--cds-border),0_1px_2px_0_rgb(0_0_0/0.05)]"
        style={{ left: `calc(${selectedIndex} * var(--cds-h-control) + 1px)`, width: "calc(var(--cds-h-control) - 2px)" }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            aria-checked={selected}
            className="cds-reset relative z-[1] inline-flex items-center justify-center gap-1.5 select-none border-0 bg-transparent outline-none rounded-[calc(var(--cds-radius)-2px)] text-body hover:text-primary data-[checked]:text-primary disabled:opacity-50 disabled:hover:text-current transition-shadow duration-fast focus-visible:shadow-focus text-muted aspect-square px-0"
            data-checked={selected ? "" : undefined}
            onClick={() => onChange(option.value)}
            role="radio"
            title={option.label}
            type="button"
          >
            {option.icon ? <Icon name={option.icon} size="sm" /> : null}
          </button>
        );
      })}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: ReactNode;
  fontFamily?: string;
};

function GhostSelect({
  align = "end",
  options,
  placeholder,
  value,
  onChange,
}: {
  align?: "start" | "center" | "end";
  options: SelectOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const activeValue = highlighted ?? selected?.value ?? options[0]?.value;
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === activeValue));
  const menuLabel = typeof selected?.label === "string" ? selected.label : selected?.label ?? placeholder;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = options[(activeIndex + delta + options.length) % options.length];
      setHighlighted(next?.value ?? null);
    }
    if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(options[0]?.value ?? null);
    }
    if (event.key === "End") {
      event.preventDefault();
      setHighlighted(options.at(-1)?.value ?? null);
    }
  };

  return (
    <Menu.Root onOpenChange={(open) => !open && setHighlighted(null)}>
      <Menu.Trigger
        className="cds-reset inline-flex h-control min-w-0 cursor-default items-center gap-1.5 rounded bg-transparent pl-sm pr-0.5 text-body text-primary outline-none transition duration-fast hover:bg-fill-ghost-hover focus-visible:shadow-focus"
        type="button"
      >
        <span className="truncate" style={selected?.fontFamily ? { fontFamily: selected.fontFamily } : undefined}>{menuLabel}</span>
        <span aria-hidden="true" className="pointer-events-none flex size-icon shrink-0 items-center justify-center text-muted">
          <Icon name="CaretDown" size="sm" />
        </span>
      </Menu.Trigger>
      <BaseMenuPopup align={align} className="w-56" side="bottom" sideOffset={4}>
        <div
          aria-label={placeholder}
          className="-m-pad-lg flex flex-col p-1"
          onKeyDown={onKeyDown}
          onMouseLeave={() => setHighlighted(null)}
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={`cds-reset flex min-h-control w-full cursor-default select-none items-center gap-2 rounded px-md py-1 text-left text-body text-primary outline-none ${option.value === highlighted ? "bg-fill-ghost-hover" : ""}`}
              key={option.value}
              onClick={() => onChange(option.value)}
              onFocus={() => setHighlighted(option.value)}
              onMouseEnter={() => setHighlighted(option.value)}
              role="option"
              style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
              tabIndex={option.value === activeValue ? 0 : -1}
              type="button"
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value ? <Icon name="Check" size="md" className="shrink-0 text-accent" /> : null}
            </button>
          ))}
        </div>
      </BaseMenuPopup>
    </Menu.Root>
  );
}

function CapabilitiesSettings() {
  const [artifacts, setArtifacts] = useState(true);
  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title="视觉内容">
        <SettingsRow description="在对话旁边的独立窗口中生成代码、文档和设计内容。" label="Artifacts" control={<Switch checked={artifacts} onCheckedChange={setArtifacts} />} />
      </SettingsSection>
    </main>
  );
}

function ConnectorsSettings() {
  return (
    <div className="flex flex-col gap-7 pb-10">
      <main>
        <section className="mb-xl last:mb-0 ">
          <div className={sectionBodyClass}>
            <div className="flex items-start justify-between gap-lg pb-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-heading-semibold text-primary">连接器</h3>
                <p className="text-footnote text-secondary">让 Claude 引用其他应用和服务，以获得更多上下文。</p>
                <p className="text-footnote text-secondary">连接器已迁移到<a className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer " href="/customize/connectors">自定义</a>。</p>
              </div>
            </div>
            <div className="pt-md">
              <div className="w-full gap-2 flex justify-center items-center text-text-400">你的组织尚未启用任何连接器</div>
              <div className="mt-6 text-sm text-text-400">在找桌面扩展？可在 <a className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer " href="/settings/desktop/extensions">这里</a> 管理。</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ClaudeCodeSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  return (
    <main>
      <SettingsSection title="本地会话">
        <SettingsRow
          description="Bypass all permission checks and let Claude work uninterrupted. Letting Claude run arbitrary commands is risky."
          label="Allow bypass permissions mode"
          control={<Switch checked={!!preferences.bypassPermissionsModeEnabled} onCheckedChange={(checked) => setPreference("bypassPermissionsModeEnabled", checked)} />}
        />
        <SettingsRow
          description="当 Claude 需要你关注且应用未处于焦点状态时，弹跳 Dock 图标或闪烁任务栏。"
          label="通过通知提醒我注意"
          control={<Switch checked={!!preferences.dockBounceEnabled} onCheckedChange={(checked) => setPreference("dockBounceEnabled", checked)} />}
        />
        <SettingsRow description="用于存放隔离 coding sessions 的 git worktree 的位置" label="Worktree 位置" control={<WorktreeSelect onChange={(value) => setPreference("chillingSlothLocation", value)} value={preferences.chillingSlothLocation} />} />
        <SettingsRow description="添加到每个 worktree 分支名称开头的前缀" label="分支前缀" control={<BranchInput onChange={(value) => setPreference("ccBranchPrefix", value)} value={preferences.ccBranchPrefix ?? ""} />} />
        <SettingsRow description="Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection." label="Preview" control={<Switch checked={!!preferences.launchEnabled} onCheckedChange={(checked) => setPreference("launchEnabled", checked)} />} />
        {preferences.launchEnabled ? <SettingsRow description="Save cookies, local storage, and login sessions for dev server previews." label="Persist Preview sessions" control={<Switch checked={!!preferences.launchPreviewPersistSession} onCheckedChange={(checked) => setPreference("launchPreviewPersistSession", checked)} />} /> : null}
      </SettingsSection>
      <SettingsSection title="拉取请求">
        <SettingsRow description="When Claude pushes changes to a branch, it automatically opens a pull request without asking first. Applies to remote sessions only." label="自动创建拉取请求" control={<Switch checked={!!preferences.autoCreatePullRequests} onCheckedChange={(checked) => setPreference("autoCreatePullRequests", checked)} />} />
      </SettingsSection>
    </main>
  );
}

function DesktopSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  return (
    <main className="flex flex-col">
      <SettingsSection title="桌面端通用设置">
        <SettingsRow description="登录电脑后自动启动 Claude" label="开机启动" control={<Switch checked={!!preferences.launchEnabled} onCheckedChange={(checked) => setPreference("launchEnabled", checked)} />} />
        <SettingsRow description="Quickly open Claude from anywhere" label="Quick Entry 快捷键" control={<ShortcutControl onChange={(value) => setPreference("quickEntryShortcut", value)} value={preferences.quickEntryShortcut ?? ""} />} />
        <SettingsRow description="在 Menu bar 中显示 Claude" label="Menu bar" control={<Switch checked={!!preferences.menuBarEnabled} onCheckedChange={(checked) => setPreference("menuBarEnabled", checked)} />} />
        <SettingsRow description="当 Claude 打开时，防止电脑因空闲而休眠，以便定时任务继续运行。显示器仍可关闭，合上笔记本盖后仍会进入睡眠。" label="保持电脑唤醒" control={<Switch checked={!!preferences.keepAwakeEnabled} onCheckedChange={(checked) => setPreference("keepAwakeEnabled", checked)} />} />
      </SettingsSection>
    </main>
  );
}

function ExtensionsOverview({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return (
    <main className="flex flex-col gap-8 h-full">
      <main className="flex flex-col gap-7">
        <section className="mb-xl last:mb-0 ">
          <div className={sectionBodyClass}>
            <div className="flex items-center justify-between gap-lg py-md  " role="group">
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <div className="text-body text-primary"><span className="text-heading-semibold">扩展</span></div>
                <div className="text-body text-muted">允许 Claude 直接与电脑上的应用、数据和工具交互。</div>
              </div>
              <div className="flex shrink-0 items-center"><CdsButton>浏览扩展</CdsButton></div>
            </div>
            <div className="pt-md">
              <div className="extensions-overview flex flex-col h-full overflow-y-auto">
                <div className="flex items-center justify-center py-8"><div className="h-24" aria-hidden="true" /></div>
                <div className="flex flex-row gap-2"><CdsButton onClick={() => onNavigate("/settings/desktop/extensions/advanced")}>高级设置</CdsButton></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </main>
  );
}

function DesktopDeveloper() {
  const [status, setStatus] = useState("");
  return (
    <main className="flex flex-col gap-8 h-full">
      <section className="mb-xl last:mb-0 ">
        <div className="mb-md flex items-start justify-between gap-lg"><div className="flex min-w-0 flex-col gap-1"><h3 className="text-heading-semibold text-primary">本地 MCP 服务器<span className="block pt-xs text-footnote font-normal text-secondary">添加并管理你当前正在开发的 MCP 服务器。 </span></h3></div></div>
        <div className={sectionBodyClass}>
          <div className="flex flex-col h-[180px] pt-md">
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden h-full">
              <div className="flex flex-col gap-3 items-center justify-center text-center flex-1 gap-4">
                <div className="h-[72px] w-[72px]" aria-hidden="true" />
                <p className="max-w-[60%] text-text-300">尚未添加任何服务器</p>
                <div className="inline-flex gap-3">
                  <CdsButton primary onClick={() => setStatus("已打开 MCP 配置编辑入口")}>编辑配置</CdsButton>
                  <a className={secondaryButtonClass} href="https://modelcontextprotocol.io/quickstart" rel="noopener noreferrer" target="_blank"><span className="absolute inset-0 -z-[1] rounded-[inherit] transition-colors duration-fast group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)] bg-fill-secondary group-hover/btn:bg-fill-secondary-hover group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent cds-btn-squish shadow-field" /><span className="inline-flex items-center gap-1 ">开发者文档</span></a>
                </div>
                {status ? <p className="text-footnote text-text-400" role="status">{status}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ExtensionsAdvanced({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const [preferences, setPreference] = useDesktopPreferences();
  const [status, setStatus] = useState("");
  return (
    <main className="flex flex-col h-full">
      <div className="px-6"><div className="extensions-header"><div className="flex items-center gap-1 mb-4"><span aria-hidden="true" className="inline-block w-4" /><BackToExtensions onNavigate={onNavigate} variant="span">All extensions</BackToExtensions></div></div></div>
      <div className="flex-1 overflow-auto px-6 space-y-6">
        <SettingsSection title="Extension Settings">
          <SettingsRow description="当有新版本可用时自动更新扩展。关闭后需要手动更新。" label="为扩展开启自动更新" control={<Switch checked={!!preferences.autoUpdateExtensions} onCheckedChange={(checked) => setPreference("autoUpdateExtensions", checked)} />} />
          <SettingsRow description="If enabled, Claude will never use the system Node.js for extension MCP servers. This happens automatically when system’s Node.js is missing or outdated. " label="Use Built-in Node.js for MCP" control={<Switch checked={!!preferences.useBuiltInNodeForMcp} onCheckedChange={(checked) => setPreference("useBuiltInNodeForMcp", checked)} />} />
          <div><p className="text-body text-primary mb-3">Detected tools</p></div>
        </SettingsSection>
        <SettingsSection title="扩展开发者">
          <div className="flex flex-col gap-6 py-md">
            <div className="w-full rounded-lg border border-danger-300 bg-bg-000 p-4 text-sm text-text-300"><div className="font-medium mb-1"> 开发者工具警告</div>这些工具仅供扩展开发者使用。错误使用可能导致扩展异常，或影响系统安全。</div>
            <div className="flex gap-3 flex-wrap">
              <CdsButton primary onClick={() => setStatus("Install Extension")}>Install Extension</CdsButton>
              <CdsButton onClick={() => setStatus("Install Unpacked Extension")}>Install Unpacked Extension</CdsButton>
              <CdsButton onClick={() => setStatus("打开扩展文件夹")}>打开扩展文件夹</CdsButton>
              <CdsButton onClick={() => setStatus("打开扩展设置文件夹")}>打开扩展设置文件夹</CdsButton>
            </div>
            {status ? <p className="text-footnote text-text-400" role="status">{status}</p> : null}
          </div>
        </SettingsSection>
      </div>
    </main>
  );
}

function ExtensionsDirectory({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const [query, setQuery] = useState("");
  return (
    <main className="flex flex-col h-full"><main className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2"><div className="flex items-center gap-1 mb-4"><span aria-hidden="true" className="inline-block w-4" /><BackToExtensions onNavigate={onNavigate} variant="span">全部扩展</BackToExtensions></div><h1 className="text-lg font-medium">[ANT ONLY] Manage global extension directory</h1><p className="text-sm text-text-300">Upload, update, delete, and manage extensions in the directory</p></div>
      <div className="flex gap-2"><input className="flex-1 px-4 py-2 rounded-lg border border-border-300 bg-bg-000 text-text-100 placeholder:text-text-400 focus:border-border-200 focus:ring-0 focus:outline-none" onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search extensions..." value={query} /></div>
      <div className="min-h-0 h-full"><div className="overflow-y-auto overflow-x-hidden min-h-0 pt-2 pb-8 h-full flex flex-col"><div className="flex-1 flex flex-col"><button className="group/card border-0.5 border-dashed border-border-300 hover:border-border-200 transition-all rounded-2xl flex flex-col gap-3 py-3 px-4 shadow-sm hover:shadow-[0_4px_20px_0_hsl(var(--always-black)/4%)] bg-bg-000 hover:bg-bg-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" type="button"><div className="flex flex-row items-center gap-3"><div className="w-9 h-9 rounded-lg bg-bg-200 flex items-center justify-center" aria-hidden="true" /><div className="flex flex-col justify-center font-ui grow min-h-[4rem]"><p className="text-text-100 text-sm font-medium">Upload new extension</p><p className="text-text-400 text-xs">向目录添加新扩展</p></div></div></button><div className="flex-1 flex items-center justify-center"><div className="text-center"><p className="text-text-300 mb-2">No extensions found</p><p className="text-text-400 text-sm">No extensions are available in the directory</p></div></div></div></div></div>
    </main></main>
  );
}

function ExtensionNotFound({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return <main className="flex flex-col h-full"><div className="flex flex-col gap-4 p-6"><BackToExtensions onNavigate={onNavigate}>All extensions</BackToExtensions><p className="text-text-300">未找到扩展</p></div></main>;
}

function BackToExtensions({ children, onNavigate, variant = "button" }: Pick<RouteViewProps, "onNavigate"> & { children: string; variant?: "button" | "span" }) {
  if (variant === "span") return <span className="cursor-pointer" onClick={() => onNavigate("/settings/desktop/extensions")}>{children}</span>;
  return <button aria-label="Back" className="inline-flex items-center w-max rounded-sm gap-1.5 pe-1 text-sm" onClick={() => onNavigate("/settings/desktop/extensions")} type="button">{children}</button>;
}

function WorktreeSelect({ onChange, value = "default" }: { onChange: (value: DesktopPreferences["chillingSlothLocation"]) => void; value?: DesktopPreferences["chillingSlothLocation"] }) {
  const isCustom = typeof value === "object";
  const label = isCustom ? "Custom..." : "Inside project (.claude/worktrees)";
  const customPath = isCustom ? value.customPath : "";
  const chooseCustom = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    onChange(paths?.[0] ? { customPath: paths[0] } : { customPath: customPath || "" });
  };
  return (
    <div className="w-[220px] flex gap-2 flex-col justify-center">
      <Menu.Root>
        <Menu.Trigger className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control rounded text-body text-primary outline-none transition duration-fast bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring hover:shadow-field-hover pl-0 pr-sm w-full" type="button">
          <span className="cds-reset flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-sm text-left border-0 bg-transparent p-0 outline-none"><span className="min-w-0 flex-1 truncate">{label}</span><span aria-hidden="true"></span></span>
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[220px]" side="bottom" sideOffset={4}>
          <BaseMenuItem checked={!isCustom} checkedRole="radio" onClick={() => onChange("default")}>Inside project (.claude/worktrees)</BaseMenuItem>
          <BaseMenuItem checked={isCustom} checkedRole="radio" onClick={chooseCustom}>Custom...</BaseMenuItem>
        </BaseMenuPopup>
      </Menu.Root>
      {customPath ? <div className="text-sm text-text-300 truncate" title={customPath}>{customPath}</div> : null}
    </div>
  );
}

function BranchInput({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return <div className="w-[220px]"><input className="cds-input cds-reset h-control pl-sm rounded bg-fill-field focus-visible:bg-surface-popover backdrop-blur-sm shadow-field-ring data-[invalid]:shadow-field-invalid text-body text-primary transition duration-fast pr-sm w-full placeholder:text-muted outline-none enabled:[&:hover:not(:focus):not([data-invalid])]:shadow-field-hover focus-visible:shadow-focus disabled:opacity-50 " data-cds="TextInput" onChange={(event) => onChange(event.currentTarget.value)} placeholder="claude" value={value} /></div>;
}

function ShortcutControl({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const display = value || "Set shortcut";
  return (
    <div className="w-[220px]">
      <button className="outline outline-1 outline-border-300/25 bg-bg-200 text-text-100 font-medium text-sm h-7 leading-7 px-2 box-border text-center min-w-[120px] rounded-md select-none relative focus-within:outline-2 focus-within:outline-brand-200 focus-within:shadow-[inset_0_1px_4px_2px_hsl(var(--always-black)/12%)] flex items-center justify-center" onClick={() => onChange(value ? "" : "⌘⇧Space")} type="button">
        <span className={value ? "text-text-100" : "text-text-500 placeholder"}>{display}</span>
      </button>
    </div>
  );
}
