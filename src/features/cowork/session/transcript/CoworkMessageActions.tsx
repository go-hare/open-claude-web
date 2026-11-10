/**
 * Official message action bar (pretty w0e + C0e flow positionMode).
 * Cowork is agent/local_session (T=true): copy for human+assistant; human rewind when
 * onRewind && !streaming; assistant footer retry is official-disabled under !T.
 * Source: c21f11e6d-CxD82rYo.js w0e / C0e.
 */
import { useState, type ReactNode } from "react";
import { micromark } from "micromark";
import { type MessageDescriptors, useI18nText } from "../../../../i18n/footerMenuMessages";
import { Icon } from "../../../../shell/icons";
import { applyCoworkRewindPrompt } from "../../composer/coworkSessionComposerActions";
import { invalidateCoworkTranscriptCache } from "../coworkTranscriptCache";
import { CoworkRetryGlyph } from "../../ui/CoworkOfficialGlyphs";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

const COWORK_MESSAGE_ACTION_MESSAGES = {
  messageActions: { defaultMessage: "Message actions", id: "8FU11i4S5Z" },
  copy: { defaultMessage: "Copy", id: "4l6vz1/eZ5" },
  copied: { defaultMessage: "Copied", id: "p556q3uvbn" },
  restartFromHere: { defaultMessage: "Restart conversation from here", id: "lHlImYcnSM" },
  retry: { defaultMessage: "Retry", id: "62nsdyMyIO" },
} as const satisfies MessageDescriptors;

export function CoworkMessageActions({
  isAssistant = false,
  isInteractive = true,
  isLastMessage,
  isStreaming = false,
  messageUuid,
  text,
}: {
  isAssistant?: boolean;
  isInteractive?: boolean;
  isLastMessage: boolean;
  isStreaming?: boolean;
  messageUuid: string;
  text: string;
}) {
  const actions = useCoworkTranscriptActions();
  const actionText = useI18nText(COWORK_MESSAGE_ACTION_MESSAGES);
  const [copied, setCopied] = useState(false);
  // Official: isAgentMode = remote || local_session. Cowork path is always agent mode.
  const isAgentMode = true;
  // Official C0e flow: hide only when assistant && streaming (E = r && l for absolute; flow uses isStreaming prop).
  const assistantStreaming = isAssistant && isStreaming;
  // Official human rewind: S && k && T && !r
  const canRewind = !isAssistant && isAgentMode && !isStreaming && Boolean(actions?.bridge.rewind);
  // Official assistant retry requires P && !T — disabled in agent/local_session.
  const canRetryAssistant = false;

  if (!isInteractive) return null;

  const copy = async () => {
    await copyRichText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const rewind = async () => {
    if (!actions?.bridge.rewind) return;
    // Official D1e rewind (~140556): mZe before host rewind mutates transcript.
    invalidateCoworkTranscriptCache(actions.sessionId);
    const prompt = await actions.bridge.rewind(actions.sessionId, messageUuid);
    if (!prompt) return;
    await applyCoworkRewindPrompt(actions.sessionId, prompt, "send");
  };

  // Official C0e positionMode="flow".
  return (
    <div
      aria-label={actionText.messageActions}
      className={classes(
        "flex justify-start",
        assistantStreaming && (isAgentMode ? "hidden" : "invisible"),
        !isLastMessage && !assistantStreaming && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition",
      )}
      role="group"
    >
      <div className="text-text-300">
        {!assistantStreaming ? (
          <div className="text-text-300 flex items-stretch justify-between">
            <MessageActionButton
              label={copied ? actionText.copied : actionText.copy}
              onClick={() => {
                void copy();
              }}
              testId="action-bar-copy"
            >
              <span className="relative text-text-500 group-hover/btn:text-text-100">
                <Icon
                  className={classes("transition-all", copied ? "opacity-0 scale-50" : "opacity-100 scale-100")}
                  customSize={16}
                  name="Copy"
                />
                <Icon
                  className={classes(
                    "absolute top-0 left-0 transition-all",
                    copied ? "opacity-100 scale-100" : "opacity-0 scale-50",
                  )}
                  customSize={16}
                  name="Check"
                />
              </span>
            </MessageActionButton>
            {canRewind ? (
              <MessageActionButton
                label={actionText.restartFromHere}
                onClick={() => {
                  void rewind();
                }}
                testId="action-bar-rewind"
              >
                <CoworkRetryGlyph className="text-text-500 group-hover/btn:text-text-100" size={16} />
              </MessageActionButton>
            ) : null}
            {canRetryAssistant ? (
              <MessageActionButton label={actionText.retry} onClick={() => undefined} testId="action-bar-retry">
                <CoworkRetryGlyph className="text-text-500 group-hover/btn:text-text-100" size={16} />
              </MessageActionButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MessageActionButton({
  children,
  label,
  onClick,
  testId,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  // Official Dc ghost icon_sm — keep existing official-class button shell.
  return (
    <button
      aria-label={label}
      className="group/btn inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 w-8 rounded-md _fill_10ocf_9 _ghost_10ocf_96"
      data-testid={testId}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

async function copyRichText(text: string) {
  const plainText = text.trim();
  if (!navigator.clipboard) return;
  if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([micromark(plainText)], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Official falls back to plain text.
    }
  }
  await navigator.clipboard.writeText(plainText);
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
