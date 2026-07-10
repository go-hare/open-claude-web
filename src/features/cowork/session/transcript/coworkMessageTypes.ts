import type { ChatMessage } from "../../../../adapters/desktopBridge/types";

export type CoworkContentBlock = Record<string, unknown> & {
  _isSubagentBlock?: boolean;
  _parentToolUseId?: string;
  alternative_display_type?: string;
  connector_text?: string;
  content?: CoworkContentBlock[] | string;
  id?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  name?: string;
  preceding_tool_use_ids?: string[];
  start_timestamp?: string;
  stop_timestamp?: string;
  summaries?: Array<{ summary?: string }>;
  summary?: string;
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  type: string;
};

export type CoworkFile = {
  created_at: null;
  file_kind: string;
  file_name: string;
  file_uuid: string;
  path: string;
};

export type CoworkChatMessage = {
  apiMessageIds?: string[];
  attachments: unknown[];
  content: CoworkContentBlock[];
  created_at: string;
  files: unknown[];
  files_v2: CoworkFile[];
  index: number;
  metadata?: Record<string, unknown>;
  parent_message_uuid?: string;
  pending?: boolean;
  sender: "assistant" | "human";
  sync_sources: unknown[];
  stop_reason?: string;
  updated_at?: string;
  uuid: string;
};

export type CoworkMessageChain = {
  displayMessage?: CoworkChatMessage;
  displayUuid: string;
  firstMessageUuid: string;
  isChain: boolean;
  isStreaming: boolean;
  lastMessageUuid: string;
  mergedContent: CoworkContentBlock[];
  messages: CoworkChatMessage[];
  messageUuids: string[];
};

export type CoworkMessageStoreOptions = {
  pendingMessages?: ChatMessage[];
  pluginsEnabled?: boolean;
};

export type CoworkMessageSegment = CoworkTimelineSegment | CoworkContentSegment;

export type CoworkTimelineSegment = {
  blocks: CoworkContentBlock[];
  statusText?: string;
  summaryType?: "thinking" | "tool_use_summary";
  timelineIndex: number;
  type: "timeline";
};

export type CoworkContentSegment = {
  blocks: CoworkContentBlock[];
  type: "content";
};

export type CoworkAssistantSequenceItem = CoworkAssistantTimelineItem | CoworkAssistantContentItem;

export type CoworkAssistantTimelineItem = {
  contentAfter?: CoworkContentSegment;
  contentAfterIndex?: number;
  contentHasTextAfter: boolean;
  isFirst: boolean;
  isLastContent: boolean;
  kind: "timeline";
  liveUpdates: boolean;
  segment: CoworkTimelineSegment;
};

export type CoworkAssistantContentItem = {
  hasTextAfter: boolean;
  index: number;
  isLastContent: boolean;
  kind: "content";
  segment: CoworkContentSegment;
};
