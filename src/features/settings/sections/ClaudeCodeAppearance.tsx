/**
 * Official Claude Code Hr Code appearance + Xn Appearance (c71860c77-DzP8HoeV).
 * Theme catalog w (c5d464fa3); sample diff Lr greet.ts.
 * Storage: epitaxy-editor-prefs (shared-14 R) + desktopFrame.interfaceFont.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useFrameStore } from "../../../stores/frameStore";
import {
  officialEpitaxyEditorPrefsStore,
  resolvedTranscriptWidth,
  type EditorSize,
} from "../../epitaxy/diff/officialEpitaxyEditorPrefs";
import { GhostSelect, SegmentedControl } from "../SettingsControls";
import { SettingsRow, SettingsSection } from "../SettingsShell";
import { useI18nText, type MessageDescriptors } from "../../../i18n/footerMenuMessages";
import { applyChatFontSetting } from "../appearanceSettings";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

const MESSAGES = {
  codeAppearance: { defaultMessage: "Code appearance", id: "hIk1k4YxSV" },
  lightCodeTheme: { defaultMessage: "Light code theme", id: "8K97GvOQwe" },
  darkCodeTheme: { defaultMessage: "Dark code theme", id: "9LRJPeVpjp" },
  codeFont: { defaultMessage: "Code font", id: "oIN0FTiMLG" },
  codeFontDescription: {
    defaultMessage: "Set a custom monospace font for code and terminal.",
    id: "vKKtEds9sW",
  },
  jetbrains: { defaultMessage: "e.g. JetBrains Mono", id: "ujyyHE5nB/" },
  appearance: { defaultMessage: "Appearance", id: "nwKczbeayM" },
  interfaceFont: { defaultMessage: "Interface font", id: "ZHco1GSUHH" },
  interfaceFontDescription: {
    defaultMessage: "Font for the whole interface — menus, sidebars, and panels.",
    id: "Dw23igsr+8",
  },
  fontLicenses: { defaultMessage: "Font licenses", id: "qnhEQK6Ni0" },
  anthropicSans: { defaultMessage: "Anthropic Sans", id: "4EAtPWhM42" },
  system: { defaultMessage: "System", id: "+CwN9C/QFk" },
  openDyslexic: { defaultMessage: "OpenDyslexic", id: "+NtGuRTRpM" },
  transcriptTextSize: { defaultMessage: "Transcript text size", id: "dmrRy2Xkmo" },
  transcriptTextSizeDescription: {
    defaultMessage: "Size of the conversation transcript text.",
    id: "csQSinIrNz",
  },
  small: { defaultMessage: "Small", id: "BPnT3TVya+" },
  medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },
  large: { defaultMessage: "Large", id: "/06iwcQHPz" },
  transcriptWidth: { defaultMessage: "Transcript width", id: "ZJehXppx5D" },
  transcriptWidthDescription: {
    defaultMessage: "Maximum width of the transcript and composer columns.",
    id: "/+WjRhGY9p",
  },
  narrow: { defaultMessage: "Narrow", id: "Cs33xZFR6o" },
  wide: { defaultMessage: "Wide", id: "0iG6KVJuYc" },
  defaultTranscriptView: { defaultMessage: "Default transcript view", id: "bTg9qb70sr" },
  defaultTranscriptViewDescription: {
    defaultMessage:
      "The view sessions open in. Picking a view from a session’s Transcript view menu changes only that session.",
    id: "Go5gcp7twi",
  },
  transcriptViewNormal: { defaultMessage: "Normal", id: "yv8cErb+k7" },
  transcriptViewThinking: { defaultMessage: "Thinking", id: "oogxH3q75G" },
  transcriptViewVerbose: { defaultMessage: "Verbose", id: "ti6aQl5Lr/" },
} as const satisfies MessageDescriptors;

type DefaultTranscriptView = "normal" | "thinking" | "verbose";

function parseDefaultTranscriptView(value: unknown): DefaultTranscriptView {
  if (value === "thinking" || value === "verbose" || value === "normal") return value;
  return "normal";
}

/** Official w catalog (c5d464fa3). */
const CODE_THEMES = [
  { value: "claude-light", label: "Claude Light", mode: "light" },
  { value: "claude-dark", label: "Claude Dark", mode: "dark" },
  { value: "github-light", label: "GitHub Light", mode: "light" },
  { value: "github-dark", label: "GitHub Dark", mode: "dark" },
  { value: "github-dark-dimmed", label: "GitHub Dark Dimmed", mode: "dark" },
  { value: "pierre-light", label: "Pierre Light", mode: "light" },
  { value: "pierre-dark", label: "Pierre Dark", mode: "dark" },
  { value: "one-dark-pro", label: "One Dark Pro", mode: "dark" },
  { value: "one-light", label: "One Light", mode: "light" },
  { value: "dracula", label: "Dracula", mode: "dark" },
  { value: "dracula-soft", label: "Dracula Soft", mode: "dark" },
  { value: "catppuccin-latte", label: "Catppuccin Latte", mode: "light" },
  { value: "catppuccin-mocha", label: "Catppuccin Mocha", mode: "dark" },
  { value: "nord", label: "Nord", mode: "dark" },
  { value: "solarized-dark", label: "Solarized Dark", mode: "dark" },
  { value: "solarized-light", label: "Solarized Light", mode: "light" },
  { value: "vitesse-dark", label: "Vitesse Dark", mode: "dark" },
  { value: "vitesse-light", label: "Vitesse Light", mode: "light" },
  { value: "min-dark", label: "Min Dark", mode: "dark" },
  { value: "min-light", label: "Min Light", mode: "light" },
  { value: "monokai", label: "Monokai", mode: "dark" },
  { value: "tokyo-night", label: "Tokyo Night", mode: "dark" },
  { value: "night-owl", label: "Night Owl", mode: "dark" },
  { value: "rose-pine", label: "Rosé Pine", mode: "dark" },
  { value: "rose-pine-dawn", label: "Rosé Pine Dawn", mode: "light" },
  { value: "ayu-dark", label: "Ayu Dark", mode: "dark" },
  { value: "slack-dark", label: "Slack Dark", mode: "dark" },
  { value: "slack-ochin", label: "Slack Ochin", mode: "light" },
] as const;

const LIGHT_THEMES = CODE_THEMES.filter((theme) => theme.mode === "light");
const DARK_THEMES = CODE_THEMES.filter((theme) => theme.mode === "dark");
const FRAME_PREFS_KEY = "desktopFrame";

type InterfaceFont = "anthropic" | "system" | "dyslexic";

function readJson(key: string): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readInterfaceFont(systemFont: boolean): InterfaceFont {
  const bag = readJson(FRAME_PREFS_KEY);
  if (bag.interfaceFont === "dyslexic" || bag.interfaceFont === "system" || bag.interfaceFont === "anthropic") {
    return bag.interfaceFont;
  }
  return systemFont ? "system" : "anthropic";
}

function applyInterfaceFont(value: InterfaceFont, setSystemFont: (next: boolean) => void) {
  const bag = readJson(FRAME_PREFS_KEY);
  window.localStorage.setItem(FRAME_PREFS_KEY, JSON.stringify({ ...bag, interfaceFont: value }));
  setSystemFont(value === "system");
  document.querySelectorAll(".dframe-root").forEach((el) => {
    el.toggleAttribute("data-system-font", value === "system");
  });
  if (value === "dyslexic") {
    applyChatFontSetting("dyslexia");
    document.documentElement.style.setProperty("--family-ui", "var(--font-open-dyslexic)");
  } else if (value === "system") {
    applyChatFontSetting("system");
    document.documentElement.style.removeProperty("--family-ui");
  } else {
    applyChatFontSetting("sans");
    document.documentElement.style.removeProperty("--family-ui");
  }
}

const CLAUDE_LIGHT = {
  bg: "#faf9f5",
  fg: "#1a1a1a",
  muted: "#999999",
  keyword: "#c5621b",
  fn: "#0073e6",
  type: "#8e6bd9",
  string: "#1e9e3c",
  delBg: "#ff3a301a",
  addBg: "#1e9e3c1a",
  del: "#ff3a30",
  add: "#1e9e3c",
};

const CLAUDE_DARK = {
  bg: "#141413",
  fg: "#ededed",
  muted: "#a6a6a6",
  keyword: "#ffd014",
  fn: "#0099ff",
  type: "#b796ff",
  string: "#32d74b",
  delBg: "#ff3a3040",
  addBg: "#32d74b33",
  del: "#ff5047",
  add: "#32d74b",
};

export function ClaudeCodeAppearance() {
  const text = useI18nText(MESSAGES);
  const frame = useFrameStore();
  const editorFont = officialEpitaxyEditorPrefsStore((state) => state.editorFont);
  const lightTheme = officialEpitaxyEditorPrefsStore((state) => state.codeThemeLight);
  const darkTheme = officialEpitaxyEditorPrefsStore((state) => state.codeThemeDark);
  const chatTextSize = officialEpitaxyEditorPrefsStore((state) => state.chatTextSize);
  const transcriptWidthChoice = officialEpitaxyEditorPrefsStore((state) => state.transcriptWidthChoice);
  const setEditorFont = officialEpitaxyEditorPrefsStore((state) => state.setEditorFont);
  const setLightTheme = officialEpitaxyEditorPrefsStore((state) => state.setCodeThemeLight);
  const setDarkTheme = officialEpitaxyEditorPrefsStore((state) => state.setCodeThemeDark);
  const setChatTextSize = officialEpitaxyEditorPrefsStore((state) => state.setChatTextSize);
  const setTranscriptWidth = officialEpitaxyEditorPrefsStore((state) => state.setTranscriptWidth);
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const [interfaceFont, setInterfaceFont] = useState<InterfaceFont>(() =>
    typeof window === "undefined" ? "anthropic" : readInterfaceFont(frame.systemFont),
  );
  const defaultTranscriptView = parseDefaultTranscriptView(
    bootstrap.account?.settings?.code_default_transcript_view,
  );

  const lightOptions = useMemo(
    () => LIGHT_THEMES.map((theme) => ({ value: theme.value, label: theme.label })),
    [],
  );
  const darkOptions = useMemo(
    () => DARK_THEMES.map((theme) => ({ value: theme.value, label: theme.label })),
    [],
  );

  return (
    <>
      <SettingsSection id="code-appearance" title={text.codeAppearance}>
        <div className="grid grid-cols-2 gap-md py-md">
          <div className="flex min-w-0 flex-col gap-sm">
            <GhostSelect
              aria-label={text.lightCodeTheme}
              onChange={(value) => setLightTheme(value)}
              options={lightOptions}
              value={lightTheme}
              variant="outline"
            />
            <GreetDiffPreview fontMono={editorFont} mode="light" theme={lightTheme} />
          </div>
          <div className="flex min-w-0 flex-col gap-sm">
            <GhostSelect
              aria-label={text.darkCodeTheme}
              onChange={(value) => setDarkTheme(value)}
              options={darkOptions}
              value={darkTheme}
              variant="outline"
            />
            <GreetDiffPreview fontMono={editorFont} mode="dark" theme={darkTheme} />
          </div>
        </div>
        <SettingsRow
          control={
            <input
              aria-label={text.codeFont}
              className="cds-input cds-reset w-56 rounded bg-fill-field px-sm py-sm text-body text-primary shadow-field-ring outline-none"
              onChange={(event) => setEditorFont(event.currentTarget.value)}
              placeholder={interfaceFont === "dyslexic" ? "e.g. OpenDyslexic Mono" : text.jetbrains}
              value={editorFont}
            />
          }
          description={text.codeFontDescription}
          label={text.codeFont}
        />
      </SettingsSection>
      <SettingsSection id="appearance" title={text.appearance}>
        <SettingsRow
          control={
            <SegmentedControl
              ariaLabel={text.interfaceFont}
              onChange={(value) => {
                const next = value as InterfaceFont;
                setInterfaceFont(next);
                applyInterfaceFont(next, frame.setSystemFont);
              }}
              options={[
                { value: "anthropic", label: text.anthropicSans },
                { value: "system", label: text.system },
                { value: "dyslexic", label: text.openDyslexic },
              ]}
              value={interfaceFont}
            />
          }
          description={
            <span>
              {text.interfaceFontDescription}{" "}
              <a className="text-accent underline" href="/third-party-notices.txt" rel="noreferrer" target="_blank">
                {text.fontLicenses}
              </a>
            </span>
          }
          label={text.interfaceFont}
        />
        <SettingsRow
          control={
            <SegmentedControl
              ariaLabel={text.transcriptTextSize}
              onChange={(value) => setChatTextSize(value as EditorSize)}
              options={[
                { value: "s", label: text.small },
                { value: "m", label: text.medium },
                { value: "l", label: text.large },
              ]}
              value={chatTextSize}
            />
          }
          description={text.transcriptTextSizeDescription}
          label={text.transcriptTextSize}
        />
        <SettingsRow
          control={
            <SegmentedControl
              ariaLabel={text.transcriptWidth}
              onChange={(value) => setTranscriptWidth(value as EditorSize)}
              options={[
                { value: "s", label: text.narrow },
                { value: "m", label: text.medium },
                { value: "l", label: text.wide },
              ]}
              value={resolvedTranscriptWidth(transcriptWidthChoice)}
            />
          }
          description={text.transcriptWidthDescription}
          label={text.transcriptWidth}
        />
        <SettingsRow
          control={
            <SegmentedControl
              ariaLabel={text.defaultTranscriptView}
              onChange={(value) => {
                const next = parseDefaultTranscriptView(value);
                void updateAccountSetting("code_default_transcript_view", next);
              }}
              options={[
                { value: "normal", label: text.transcriptViewNormal },
                { value: "thinking", label: text.transcriptViewThinking },
                { value: "verbose", label: text.transcriptViewVerbose },
              ]}
              value={defaultTranscriptView}
            />
          }
          description={text.defaultTranscriptViewDescription}
          label={text.defaultTranscriptView}
        />
      </SettingsSection>
    </>
  );
}

function paletteFor(theme: string, mode: "light" | "dark") {
  if (theme === "claude-dark" || theme.startsWith("claude-dark")) return CLAUDE_DARK;
  if (theme === "claude-light") return CLAUDE_LIGHT;
  return mode === "dark" ? CLAUDE_DARK : CLAUDE_LIGHT;
}

/** Official Lr greet.ts unified classic preview (Hr) — theme + fontMono from Wt. */
function GreetDiffPreview({
  fontMono,
  mode,
  theme,
}: {
  fontMono: string;
  mode: "light" | "dark";
  theme: string;
}) {
  const palette = paletteFor(theme, mode);
  const family = fontMono.trim()
    ? `${fontMono}, ui-monospace, SFMono-Regular, Menlo, monospace`
    : "ui-monospace, SFMono-Regular, Menlo, monospace";
  return (
    <div
      className="min-h-[94px] overflow-clip rounded-lg border"
      style={{ background: palette.bg, color: palette.fg, fontFamily: family, fontSize: 12, lineHeight: "18px" }}
    >
      <pre className="m-0 px-3 py-2">
        <DiffLine n="1" palette={palette}>
          {"  "}
          <Kw palette={palette}>function</Kw> <Fn palette={palette}>greet</Fn>(name: <Ty palette={palette}>string</Ty>) {"{"}
        </DiffLine>
        <DiffLine kind="del" n="2" palette={palette}>
          {"  "}return <Str palette={palette}>{"\"Hello, \""}</Str> + name;
        </DiffLine>
        <DiffLine kind="add" n="2" palette={palette}>
          {"  "}return <Str palette={palette}>{"`Hello, ${name}!`"}</Str>;
        </DiffLine>
        <DiffLine n="3" palette={palette}>
          {"}"}
        </DiffLine>
      </pre>
    </div>
  );
}

function DiffLine({
  children,
  kind,
  n,
  palette,
}: {
  children: ReactNode;
  kind?: "add" | "del";
  n: string;
  palette: typeof CLAUDE_LIGHT;
}) {
  const bg = kind === "add" ? palette.addBg : kind === "del" ? palette.delBg : "transparent";
  const mark = kind === "add" ? "+" : kind === "del" ? "-" : " ";
  const markColor = kind === "add" ? palette.add : kind === "del" ? palette.del : palette.muted;
  return (
    <div style={{ background: bg }}>
      <span style={{ color: palette.muted, display: "inline-block", width: 18 }}>{n}</span>
      <span style={{ color: markColor, display: "inline-block", width: 14 }}>{mark}</span>
      {children}
    </div>
  );
}

function Kw({ children, palette }: { children: ReactNode; palette: typeof CLAUDE_LIGHT }) {
  return <span style={{ color: palette.keyword }}>{children}</span>;
}
function Fn({ children, palette }: { children: ReactNode; palette: typeof CLAUDE_LIGHT }) {
  return <span style={{ color: palette.fn }}>{children}</span>;
}
function Ty({ children, palette }: { children: ReactNode; palette: typeof CLAUDE_LIGHT }) {
  return <span style={{ color: palette.type }}>{children}</span>;
}
function Str({ children, palette }: { children: ReactNode; palette: typeof CLAUDE_LIGHT }) {
  return <span style={{ color: palette.string }}>{children}</span>;
}
