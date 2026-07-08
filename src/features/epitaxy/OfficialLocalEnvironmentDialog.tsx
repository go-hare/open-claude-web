import { Dialog } from "@base-ui-components/react/dialog";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocalEnvironmentVariables, LocalSessionEnvironmentBridge } from "../../adapters/desktopBridge";
import { OfficialButton } from "./OfficialEpitaxyComponents";

type OfficialLocalEnvironmentDialogProps = {
  bridge?: LocalSessionEnvironmentBridge;
  isOpen: boolean;
  onClose: () => void;
};

const officialInputWrapperClass = "rounded-r4 bg-fill-contained-default effect-contrast-stroke";
const officialTextareaClass = "epitaxy-textarea w-full !bg-transparent !shadow-none font-mono text-code";
const officialTextareaPlaceholder = 'NODE_ENV=production\nGIT_AUTHOR_NAME=Your Name\n\n# Multiline values - wrap in quotes\nCONFIG="key1=val1\nkey2=val2"';
const envLinePattern = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
const envKeyPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const managedEnvironmentVariables = [
  "PATH",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "DISABLE_AUTOUPDATER",
  "CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES",
  "CLAUDE_CODE_DISABLE_CRON",
];

export function OfficialLocalEnvironmentDialog({ bridge, isOpen, onClose }: OfficialLocalEnvironmentDialogProps) {
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLoaded(false);
      setApiError(null);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setApiError(null);
    const loadEnvironment = bridge?.get?.();
    if (!loadEnvironment) {
      setValue("");
      setApiError("Environment API not available.");
      setLoaded(true);
      return;
    }
    void loadEnvironment
      .then((environment) => {
        if (cancelled) return;
        setValue(serializeEnvironmentVariables(normalizeEnvironmentVariables(environment)));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setValue("");
        setApiError("Failed to load environment variables.");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bridge, isOpen]);

  const validationError = useMemo(() => validateEnvironmentText(value, { checkManagedVars: true }), [value]);
  const canSave = !validationError;

  const save = useCallback(async () => {
    if (!canSave || saving) return;
    if (!bridge?.save) {
      setApiError("Environment API not available.");
      return;
    }
    setSaving(true);
    setApiError(null);
    try {
      await bridge.save(parseEnvironmentText(value));
      onClose();
    } catch {
      setApiError("Failed to save environment variables.");
    } finally {
      setSaving(false);
    }
  }, [bridge, canSave, onClose, saving, value]);

  if (!isOpen || !loaded) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none" />
        <Dialog.Popup className="epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] draggable-none outline-none">
          <div className="relative isolate rounded-r6 flex flex-col max-h-[inherit]">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className="flex items-center justify-between gap-g4 px-[24px] pt-[24px]">
              <Dialog.Title className="text-heading-semibold text-t9">Update local environment</Dialog.Title>
              <OfficialButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} size="small" variant="uncontained" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[24px] pt-[16px]">
              <form
                className="flex flex-col gap-[28px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <OfficialEnvironmentField
                  error={validationError ?? apiError ?? undefined}
                  help={(
                    <>
                      In <OfficialEnvironmentLink href="https://code.claude.com/docs/en/desktop#environment-configuration">.env format</OfficialEnvironmentLink>. These are stored securely and passed to Claude sessions.
                    </>
                  )}
                  label="Environment variables"
                >
                  <div className={officialInputWrapperClass}>
                    <textarea
                      autoComplete="off"
                      className={officialTextareaClass}
                      data-1p-ignore="true"
                      data-lpignore="true"
                      disabled={saving}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder={officialTextareaPlaceholder}
                      rows={8}
                      value={value}
                    />
                  </div>
                </OfficialEnvironmentField>
                <button aria-hidden="true" disabled={saving} hidden tabIndex={-1} type="submit" />
                <div className="flex justify-end gap-g4">
                  <OfficialButton disabled={saving} onClick={onClose} variant="contained">Cancel</OfficialButton>
                  <OfficialButton disabled={!canSave || saving} onClick={() => void save()} variant="primary">Save changes</OfficialButton>
                </div>
              </form>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OfficialEnvironmentField({
  as: Component = "label",
  children,
  error,
  help,
  label,
  warning,
}: {
  as?: "div" | "label";
  children: ReactNode;
  error?: ReactNode;
  help?: ReactNode;
  label: ReactNode;
  warning?: ReactNode;
}) {
  return (
    <Component className="flex flex-col gap-g4">
      <span className="flex flex-col gap-g1">
        <span className="text-body text-t8">{label}</span>
        {help ? <span className="text-footnote text-t6">{help}</span> : null}
      </span>
      {children}
      {error ? <span className="text-footnote text-danger-000">{error}</span> : null}
      {warning ? <span className="text-footnote text-warning-000">{warning}</span> : null}
    </Component>
  );
}

function OfficialEnvironmentLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a className="underline underline-offset-2" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function normalizeEnvironmentVariables(environment: unknown): LocalEnvironmentVariables {
  const raw = asRecord(environment);
  const source = typeof raw.env === "object" && raw.env !== null ? asRecord(raw.env) : raw;
  const result: LocalEnvironmentVariables = {};
  for (const [key, item] of Object.entries(source)) {
    if (typeof item === "string") result[key] = item;
    else if (typeof item === "number" || typeof item === "boolean") result[key] = String(item);
  }
  return result;
}

function validateEnvironmentText(text: string, options?: { checkManagedVars?: boolean }) {
  if (!text.trim()) return undefined;
  const parsed = parseEnvironmentText(text);
  for (const key of Object.keys(parsed)) {
    if (!envKeyPattern.test(key)) return `Invalid key "${key}". Use letters, numbers, and underscores only.`;
    if (options?.checkManagedVars && managedEnvironmentVariables.includes(key)) return `"${key}" is managed by Claude Desktop and cannot be overridden.`;
  }
  return undefined;
}

function parseEnvironmentText(text: string): LocalEnvironmentVariables {
  if (!text.trim()) return {};
  const result: LocalEnvironmentVariables = {};
  const normalized = text.replace(/\r\n?/gm, "\n");
  envLinePattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = envLinePattern.exec(normalized)) !== null) {
    const key = match[1];
    let nextValue = match[2] ?? "";
    nextValue = nextValue.trim();
    const quote = nextValue[0];
    nextValue = nextValue.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === "\"") {
      nextValue = nextValue.replace(/\\n/g, "\n");
      nextValue = nextValue.replace(/\\r/g, "\r");
    }
    result[key] = nextValue;
  }
  return result;
}

function serializeEnvironmentVariables(environment: LocalEnvironmentVariables) {
  return Object.entries(environment)
    .map(([key, rawValue]) => {
      const item = String(rawValue);
      if (!(item.includes("\n") || item.includes("$") || item.includes("#") || item.includes("\"") || item.includes("'") || item.startsWith(" ") || item.endsWith(" "))) return `${key}=${item}`;
      if (!item.includes("'")) return `${key}='${item}'`;
      return `${key}="${item.replace(/"/g, "\\\"")}"`;
    })
    .join("\n");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
