import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CoworkTimelineClockGlyph } from "../../ui/CoworkOfficialGlyphs";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageModel";
import { CoworkMarkdown } from "./CoworkMarkdown";
import { CoworkTimelineGroupItem } from "./CoworkTimelinePrimitives";
import { CoworkToolRenderer } from "./CoworkToolRenderer";

type CoworkTimelineBlockProps = {
  allBlocks: CoworkContentBlock[];
  block: CoworkContentBlock;
  index: number;
  isFirstItem: boolean;
  isInExpandedTimeline: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  message: CoworkChatMessage;
};

export function CoworkTimelineBlock({ allBlocks, block, index, isFirstItem, isLastItem, isStreaming, message }: CoworkTimelineBlockProps) {
  if (block.type === "synthetic_working") return null;
  const lastBlock = isLastMessageBlock(allBlocks, index);
  const effectiveStreaming = isStreaming && (!block.stop_timestamp || lastBlock && message.stop_reason === "max_tokens");
  if (block.type === "thinking") {
    if (block.alternative_display_type === "working") return <CoworkTimelineMarkdownItem block={block} isFirstItem={isFirstItem} isLastItem={isLastItem} isStreaming={effectiveStreaming} />;
    return <CoworkTimelineThinkingText isFirstItem={isFirstItem} isLastItem={isLastItem} isStreaming={effectiveStreaming} text={block.thinking ?? ""} />;
  }
  if (block.type === "text" || block.type === "connector_text") {
    const text = block.type === "text" ? block.text ?? "" : block.connector_text ?? "";
    return <CoworkTimelineTextItem isFirstItem={isFirstItem} isLastItem={isLastItem} isStreaming={effectiveStreaming} text={text} />;
  }
  if (block.type !== "tool_use") return null;
  const toolResult = allBlocks.find((candidate) => candidate.type === "tool_result" && candidate.tool_use_id === block.id);
  return <CoworkToolRenderer block={block} isFirstBlockOfMessage={index === 0} isFirstItem={isFirstItem} isLastBlockOfMessage={lastBlock} isLastItem={isLastItem} isStreaming={effectiveStreaming && !toolResult} message={message} toolResult={toolResult} />;
}

function CoworkTimelineThinkingText({ isFirstItem, isLastItem, isStreaming, text }: { isFirstItem: boolean; isLastItem: boolean; isStreaming: boolean; text: string }) {
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
          <CoworkRenderedMarkdown isStreaming={isStreaming} text={text} />
        </CoworkTimelineTextContent>
      </div>
    </CoworkTimelineGroupItem>
  );
}

function CoworkTimelineMarkdownItem({ block, isFirstItem, isLastItem, isStreaming }: { block: CoworkContentBlock; isFirstItem: boolean; isLastItem: boolean; isStreaming: boolean }) {
  return (
    <CoworkTimelineGroupItem isActive={isStreaming} isFirstItem={isFirstItem} isLastItem={isLastItem} showDotFallback>
      <CoworkTimelineTextContent isStreaming={isStreaming}><CoworkRenderedMarkdown isStreaming={isStreaming} text={block.thinking ?? ""} /></CoworkTimelineTextContent>
    </CoworkTimelineGroupItem>
  );
}

function CoworkTimelineTextItem({ isFirstItem, isLastItem, isStreaming, text }: { isFirstItem: boolean; isLastItem: boolean; isStreaming: boolean; text: string }) {
  if (!text) return null;
  return (
    <CoworkTimelineGroupItem isActive={isStreaming} isFirstItem={isFirstItem} isLastItem={isLastItem} showDotFallback>
      <CoworkTimelineTextContent isStreaming={isStreaming}><CoworkRenderedMarkdown isStreaming={isStreaming} text={text} /></CoworkTimelineTextContent>
    </CoworkTimelineGroupItem>
  );
}

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
  if (isStreaming) return <div aria-live="off" className="px-2.5 text-text-300 !font-base [&_p]:!font-base [&_p]:!m-0 [&_p]:!p-0">{children}</div>;
  return (
    <div className="px-2.5 text-text-300 !font-base [&_p]:!font-base [&_p]:!m-0 [&_p]:!p-0">
      <div className="relative overflow-hidden transition-[max-height] duration-300 ease-out" ref={contentRef} style={{ maxHeight: expanded ? `${height}px` : "200px" }}>
        {children}
        {collapsible && !expanded ? <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-100 to-transparent pointer-events-none" /> : null}
      </div>
      {collapsible ? <button className="text-xs text-text-500/80 hover:text-text-100 transition" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? "Show less" : "Show more"}</button> : null}
    </div>
  );
}

function CoworkRenderedMarkdown({ isStreaming, text }: { isStreaming: boolean; text: string }) {
  return <div className={isStreaming ? "progressive-markdown" : "standard-markdown"}><CoworkMarkdown isStreaming={isStreaming} text={text} /></div>;
}

function isLastMessageBlock(blocks: CoworkContentBlock[], index: number) {
  const next = blocks[index + 1];
  return blocks.length > 0 && index === blocks.length - 1 - (next?.type === "tool_result" ? 1 : 0);
}
