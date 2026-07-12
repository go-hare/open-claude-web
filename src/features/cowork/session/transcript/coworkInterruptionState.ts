import type { CoworkAssistantSequenceItem, CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";
import type { CoworkInterruptionVariant } from "./CoworkResponseInterruption";

export function coworkInterruptionVariant(
  sequence: CoworkAssistantSequenceItem[],
  message: Pick<CoworkChatMessage, "stop_reason">,
  conversationIsStreaming: boolean,
  isThisMessageStreaming: boolean,
): CoworkInterruptionVariant | null {
  if (!isThisMessageStreaming && message.stop_reason === "user_canceled") return "user_canceled";
  if (conversationIsStreaming || isThisMessageStreaming || message.stop_reason) return null;
  return terminalTimeline(sequence) ? "no_stop_reason" : null;
}

export function coworkInterruptedTimelineIndex(sequence: CoworkAssistantSequenceItem[]) {
  return terminalTimeline(sequence)?.segment.timelineIndex;
}

function terminalTimeline(sequence: CoworkAssistantSequenceItem[]) {
  const final = sequence.at(-1);
  const previous = sequence.at(-2);
  if (final?.kind === "timeline" && !final.contentAfter?.blocks.some(hasVisibleText)) return final;
  if (final?.kind !== "content" || final.segment.blocks.some(hasVisibleText)) return undefined;
  return previous?.kind === "timeline" && !previous.contentAfter?.blocks.some(hasVisibleText)
    ? previous
    : undefined;
}

function hasVisibleText(block: CoworkContentBlock) {
  return block.type === "text" && Boolean(block.text?.trim())
    || block.type === "connector_text" && Boolean(block.connector_text?.trim());
}
