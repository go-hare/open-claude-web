import type { ChatMessage } from "../../../../adapters/desktopBridge/types";
import type { CoworkStreamSnapshot } from "../stream/coworkStreamTypes";
import { buildOfficialCoworkMessageChains } from "./coworkMessageChains";
import { buildCoworkChatMessages } from "./coworkMessageStore";

export type {
  CoworkChatMessage,
  CoworkAssistantSequenceItem,
  CoworkContentBlock,
  CoworkFile,
  CoworkMessageChain,
  CoworkMessageSegment,
} from "./coworkMessageTypes";
export { buildCoworkChatMessages, normalizeSdkMessages } from "./coworkMessageStore";
export { buildOfficialCoworkMessageChains, createOfficialCoworkMessageChain } from "./coworkMessageChains";
export {
  arrangeCoworkAssistantSegments,
  buildCoworkAssistantSequence,
  isOfficialCoworkRichTool,
  segmentCoworkMessageBlocks,
  visibleCoworkAssistantBlocks,
} from "./coworkTimelineModel";

export function buildCoworkMessageChains(messages: ChatMessage[], streamSnapshot: CoworkStreamSnapshot) {
  const chatMessages = buildCoworkChatMessages(messages, streamSnapshot);
  return buildOfficialCoworkMessageChains(chatMessages, streamSnapshot?.messageId);
}
