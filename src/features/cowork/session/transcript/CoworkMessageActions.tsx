import { useState } from "react";
import { CoworkButton } from "../../ui/CoworkButton";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export function CoworkMessageActions({ isAssistant = false, isLastMessage, isStreaming = false, messageUuid, text }: {
  align?: "start" | "end";
  isAssistant?: boolean;
  isLastMessage: boolean;
  isStreaming?: boolean;
  messageUuid: string;
  text: string;
}) {
  const actions = useCoworkTranscriptActions();
  const [copied, setCopied] = useState(false);
  const assistantStreaming = isAssistant && isStreaming;
  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const rewind = async () => {
    await actions?.bridge.rewind?.(actions.sessionId, messageUuid);
    await actions?.reload();
  };
  return (
    <div
      aria-label="Message actions"
      className={classes("flex justify-start", assistantStreaming && "invisible", !isLastMessage && !assistantStreaming && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition")}
      role="group"
    >
      <div className="text-text-300">
        {!assistantStreaming ? (
          <div className="text-text-300 flex items-stretch justify-between">
            <CoworkButton ariaLabel={copied ? "Copied" : "Copy"} className="group/btn" icon={copied ? "Check" : "Copy"} onClick={() => { void copy(); }} size="small" />
            {!isAssistant && actions?.bridge.rewind ? <CoworkButton ariaLabel="Restart conversation from here" className="group/btn" icon="Reload" onClick={() => { void rewind(); }} size="small" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
