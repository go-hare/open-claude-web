import { useMemo, useState } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";

const ADD_CONNECTOR_MESSAGES = {
  title: { defaultMessage: "Add custom connector", id: "2+VODHagkt" },
  name: { defaultMessage: "Name", id: "HAlOn1ZsuY" },
  serverUrl: { defaultMessage: "Remote MCP server URL", id: "BeNH4k5JPv" },
  advanced: { defaultMessage: "Advanced settings", id: "V72EhnbTFu" },
  clientId: { defaultMessage: "OAuth Client ID (optional)", id: "rS2iOWRASM" },
  clientSecret: { defaultMessage: "OAuth Client Secret (optional)", id: "XDbEJBLE7c" },
  invalidUrl: { defaultMessage: "Invalid URL format", id: "Zx2+7F8Kf5" },
  httpsRequired: { defaultMessage: "URL must start with 'https'", id: "tLIngV91a5" },
} as const satisfies MessageDescriptors;
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialTextInput } from "../../shared/OfficialTextInput";

/**
 * Official ce99eb202 J / G — Add custom connector (Ht qa).
 * Tm modalSize lg, className !max-w-[33.5rem], Name + Remote MCP server URL,
 * Advanced settings, Cancel / Add. Not a homemade card dialog.
 */
const LEARN_MORE_HREF =
  "https://support.anthropic.com/en/articles/11175166-about-custom-integrations-using-remote-mcp";
const PREBUILT_HREF =
  "https://support.anthropic.com/en/articles/11176164-pre-built-integrations-using-remote-mcp";
const MCP_ISSUES_HREF = "https://github.com/anthropics/claude-ai-mcp";

export function AddCustomConnectorDialog({
  initialName = "",
  initialUrl = "",
  onClose,
  onSubmit,
}: {
  initialName?: string;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (value: {
    clientId?: string;
    clientSecret?: string;
    name: string;
    url: string;
  }) => void;
}) {
  const text = useI18nText(ADD_CONNECTOR_MESSAGES);
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const urlError = useMemo(() => urlHint(url, text.invalidUrl, text.httpsRequired), [text.httpsRequired, text.invalidUrl, url]);
  const canSubmit = name.trim().length > 0 && isHttpsUrl(url);

  return (
    <OfficialModal
      className="!max-w-[33.5rem]"
      hasCloseButton
      isOpen
      modalSize="lg"
      onClose={onClose}
      subtitle={
        <span>
          Connect Claude to your data and tools.{" "}
          <a className="underline" href={LEARN_MORE_HREF} rel="noopener noreferrer" target="_blank">
            Learn more about connectors
          </a>{" "}
          or get started with{" "}
          <a className="underline" href={PREBUILT_HREF} rel="noopener noreferrer" target="_blank">
            pre-built ones
          </a>
          .
        </span>
      }
      title={
        <div className="flex gap-2 items-center">
          <span>{text.title}</span>
          <span className="inline-flex items-center rounded-md bg-bg-300 px-1.5 py-0.5 text-xs text-text-300">
            BETA
          </span>
        </div>
      }
    >
      <form
        className="flex max-h-[min(42rem,75vh)] flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          onSubmit({
            name: name.trim(),
            url: url.trim(),
            ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
            ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
          });
        }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto pr-1">
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col">
              <OfficialTextInput
                data-1p-ignore
                error={name.trim() === ""}
                onBlur={() => setName((value) => value.trim())}
                onValueChange={setName}
                placeholder={text.name}
                required
                value={name}
              />
            </div>
            <div className="flex flex-col">
              <OfficialTextInput
                error={Boolean(url) && !isHttpsUrl(url)}
                onBlur={() => setUrl((value) => value.trim())}
                onValueChange={setUrl}
                placeholder={text.serverUrl}
                required
                value={url}
              />
              {urlError ? <p className="mt-1 text-xs text-danger-000">{urlError}</p> : null}
            </div>
          </div>
          <div className="mt-4">
            <button
              className="flex items-center gap-1 text-sm"
              onClick={() => setAdvancedOpen((open) => !open)}
              type="button"
            >
              <Icon
                className={`transition-transform duration-200 ${advancedOpen ? "rotate-90" : ""}`}
                customSize={14}
                name="CaretRight"
              />
              {text.advanced}
            </button>
            <div
              className={
                advancedOpen
                  ? "max-h-[32rem] opacity-100 transition-all duration-200"
                  : "max-h-0 opacity-0 overflow-hidden transition-all duration-200"
              }
            >
              <div className="mt-2 flex flex-col gap-3">
                <OfficialTextInput
                  onBlur={() => setClientId((value) => value.trim())}
                  onValueChange={setClientId}
                  placeholder={text.clientId}
                  value={clientId}
                />
                <OfficialTextInput
                  onBlur={() => setClientSecret((value) => value.trim())}
                  onValueChange={setClientSecret}
                  placeholder={text.clientSecret}
                  type="password"
                  value={clientSecret}
                />
              </div>
            </div>
          </div>
          <p className="mt-6 text-text-500 text-sm">
            Only use connectors from developers you trust. Anthropic does not control which tools
            developers make available and cannot verify that they will work as intended or that they
            won&apos;t change.
          </p>
          <p className="mt-3 text-text-500 text-sm">
            Building an MCP server?{" "}
            <a className="underline" href={MCP_ISSUES_HREF} rel="noopener noreferrer" target="_blank">
              Report issues and subscribe to updates here
            </a>
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <OfficialButton onClick={onClose} variant="secondary">
            Cancel
          </OfficialButton>
          <OfficialButton disabled={!canSubmit} type="submit" variant="primary">
            Add
          </OfficialButton>
        </div>
      </form>
    </OfficialModal>
  );
}

/** Official Z — https only (mcprelay gated out in this shell). */
function isHttpsUrl(value: string): boolean {
  if (!value || !URL.canParse(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Official X secondaryLabel. */
function urlHint(value: string, invalidUrl: string, httpsRequired: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("https")) {
    return URL.canParse(trimmed) ? null : invalidUrl;
  }
  return httpsRequired;
}

