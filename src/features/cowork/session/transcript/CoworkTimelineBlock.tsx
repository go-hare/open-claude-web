import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageModel";
import { CoworkTimelineClockGlyph } from "../../ui/CoworkOfficialGlyphs";
import { CoworkAssistantMarkdown } from "./CoworkAssistantMarkdown";
import { coworkComputerLinkPath } from "./coworkComputerLink";
import { CoworkTimelineGroupItem } from "./CoworkTimelinePrimitives";
import { CoworkOfficialToolRenderer } from "./CoworkOfficialToolRenderer";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

/**
 * Official gst TimelineBlock (index-BELzQL5P.js).
 * thinking → Net clock-markdown row (not z9e → O9e ThinkingCell).
 * tool streaming: isStreaming || (last && isThisMessageStreaming && max_tokens && stop_timestamp).
 * thinking streaming: isThisMessageStreaming && (!stop_timestamp || last && max_tokens).
 */
type CoworkTimelineBlockProps = {
  allBlocks: CoworkContentBlock[];
  block: CoworkContentBlock;
  index: number;
  isFirstItem: boolean;
  isInExpandedTimeline: boolean;
  isLastItem: boolean;
  /** Official gst `isStreaming` (liveUpdates && isThisMessageStreaming). Used by tools. */
  isStreaming: boolean;
  /** Official gst `isThisMessageStreaming`. Used by thinking/text Net formula. */
  isThisMessageStreaming: boolean;
  message: CoworkChatMessage;
};

export function CoworkTimelineBlock({
  allBlocks,
  block,
  index,
  isFirstItem,
  isLastItem,
  isStreaming,
  isThisMessageStreaming,
  message,
}: CoworkTimelineBlockProps) {
  if (block.type === "synthetic_working") return null;
  const lastBlock = isLastMessageBlock(allBlocks, index);
  const stopReason = message.stop_reason;
  // Official gst tool D: f || (last && isThisMessageStreaming && max_tokens && stop_timestamp).
  const toolStreaming = Boolean(
    isStreaming
    || lastBlock
      && isThisMessageStreaming
      && stopReason === "max_tokens"
      && "stop_timestamp" in block
      && block.stop_timestamp,
  );
  // Official gst thinking Net: isThisMessageStreaming && (!stop_timestamp || last && max_tokens).
  const thinkingStreaming = Boolean(
    isThisMessageStreaming && (!block.stop_timestamp || lastBlock && stopReason === "max_tokens"),
  );

  if (block.type === "thinking") {
    if (block.alternative_display_type === "working") {
      return (
        <CoworkTimelineMarkdownItem
          block={block}
          isFirstItem={isFirstItem}
          isLastItem={isLastItem}
          isStreaming={thinkingStreaming}
          messageUuid={message.uuid}
        />
      );
    }
    return (
      <CoworkTimelineThinkingItem
        isFirstItem={isFirstItem}
        isLastItem={isLastItem}
        isStreaming={thinkingStreaming}
        messageUuid={message.uuid}
        text={block.thinking ?? ""}
      />
    );
  }
  if (block.type === "text" || block.type === "connector_text") {
    const text = block.type === "text" ? block.text ?? "" : block.connector_text ?? "";
    // Official gst text: progressive uses isThisMessageStreaming; group isActive = streaming && last.
    return (
      <CoworkTimelineTextItem
        block={block}
        isActive={isThisMessageStreaming && lastBlock}
        isFirstItem={isFirstItem}
        isLastItem={isLastItem}
        isStreaming={isThisMessageStreaming}
        messageUuid={message.uuid}
        text={text}
      />
    );
  }
  if (block.type !== "tool_use") return null;
  const toolResult = allBlocks.find((candidate) => candidate.type === "tool_result" && candidate.tool_use_id === block.id);
  return (
    <CoworkOfficialToolRenderer
      block={block}
      isFirstBlockOfMessage={index === 0}
      isFirstItem={isFirstItem}
      isLastBlockOfMessage={lastBlock}
      isLastItem={isLastItem}
      isStreaming={toolStreaming && !toolResult}
      message={message}
      toolResult={toolResult}
    />
  );
}

/** Official Net: clock glyph + jet collapsible markdown body. */
function CoworkTimelineThinkingItem({
  isFirstItem,
  isLastItem,
  isStreaming,
  messageUuid,
  text,
}: {
  isFirstItem: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  messageUuid: string;
  text: string;
}) {
  if (!text) return null;
  return (
    <CoworkTimelineGroupItem
      icon={<CoworkTimelineClockGlyph className="text-text-500" size={16} />}
      isActive={isStreaming}
      isFirstItem={isFirstItem}
      isLastItem={isLastItem}
      showDotFallback={false}
    >
      <div className="pt-0.5">
        <CoworkTimelineTextContent isStreaming={isStreaming}>
          <CoworkRenderedMarkdown headingLevelOffset={1} isStreaming={isStreaming} messageUuid={messageUuid} text={text} />
        </CoworkTimelineTextContent>
      </div>
    </CoworkTimelineGroupItem>
  );
}

function CoworkTimelineMarkdownItem({
  block,
  isFirstItem,
  isLastItem,
  isStreaming,
  messageUuid,
}: {
  block: CoworkContentBlock;
  isFirstItem: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  messageUuid: string;
}) {
  return (
    <CoworkTimelineGroupItem isActive={isStreaming} isFirstItem={isFirstItem} isLastItem={isLastItem} showDotFallback>
      <CoworkTimelineTextContent isStreaming={isStreaming}>
        <CoworkRenderedMarkdown headingLevelOffset={1} isStreaming={isStreaming} messageUuid={messageUuid} text={block.thinking ?? ""} />
      </CoworkTimelineTextContent>
    </CoworkTimelineGroupItem>
  );
}

function CoworkTimelineTextItem({
  block,
  isActive,
  isFirstItem,
  isLastItem,
  isStreaming,
  messageUuid,
  text,
}: {
  block: CoworkContentBlock;
  isActive: boolean;
  isFirstItem: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  messageUuid: string;
  text: string;
}) {
  if (!text) return null;
  return (
    <CoworkTimelineGroupItem isActive={isActive} isFirstItem={isFirstItem} isLastItem={isLastItem} showDotFallback>
      <CoworkTimelineTextContent isStreaming={isStreaming}>
        <CoworkRenderedMarkdown
          blockCitations={Array.isArray(block.citations) ? block.citations : []}
          headingLevelOffset={1}
          isStreaming={isStreaming}
          messageUuid={messageUuid}
          text={text}
        />
      </CoworkTimelineTextContent>
    </CoworkTimelineGroupItem>
  );
}

/** Official jet: collapse long settled bodies past 200px. */
function CoworkTimelineTextContent({ children, isStreaming = false }: { children: ReactNode; isStreaming?: boolean }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    if (!contentRef.current || isStreaming) return;
    const nextHeight = contentRef.current.scrollHeight;
    setHeight(nextHeight);
    setCollapsible(nextHeight > 200);
  }, [children, isStreaming]);
  if (isStreaming) {
    return (
      <div aria-live="off" className="px-2.5 text-text-300 !font-base [&_p]:!font-base [&_p]:!m-0 [&_p]:!p-0">
        {children}
      </div>
    );
  }
  return (
    <div className="px-2.5 text-text-300 !font-base [&_p]:!font-base [&_p]:!m-0 [&_p]:!p-0">
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        ref={contentRef}
        style={{ maxHeight: expanded ? `${height}px` : "200px" }}
      >
        {children}
        {collapsible && !expanded ? (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-100 to-transparent pointer-events-none" />
        ) : null}
      </div>
      {collapsible ? (
        <button
          className="text-xs text-text-500/80 hover:text-text-100 transition"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function CoworkRenderedMarkdown({
  blockCitations = [],
  headingLevelOffset = 1,
  isStreaming,
  messageUuid,
  text,
}: {
  blockCitations?: readonly unknown[];
  headingLevelOffset?: number;
  isStreaming: boolean;
  messageUuid: string;
  text: string;
}) {
  const actions = useCoworkTranscriptActions();
  const onLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>, url: string) => {
    const path = coworkComputerLinkPath(url);
    if (!path) return;
    event.preventDefault();
    actions?.openFile({ path, toolType: "create_file" });
  }, [actions]);
  return (
    <CoworkAssistantMarkdown
      blockCitations={blockCitations}
      className={isStreaming ? "progressive-markdown" : "standard-markdown"}
      headingLevelOffset={headingLevelOffset}
      isStreaming={isStreaming}
      messageUuid={messageUuid}
      onLinkClick={onLinkClick}
      text={text}
    />
  );
}

function isLastMessageBlock(blocks: CoworkContentBlock[], index: number) {
  const next = blocks[index + 1];
  return blocks.length > 0 && index === blocks.length - 1 - (next?.type === "tool_result" ? 1 : 0);
}
