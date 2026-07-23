import { useCallback, type MouseEvent } from "react";
import type { CoworkContentBlock, CoworkContentSegment } from "./coworkMessageTypes";
import type { CoworkAssistantTimelineStore } from "./coworkAssistantTimelineStore";
import { useCoworkTimelineStoreItem } from "./coworkAssistantTimelineStore";
import { CoworkAssistantMarkdown } from "./CoworkAssistantMarkdown";
import { useCoworkAssistantRenderContext } from "./CoworkAssistantRenderContext";
import { coworkComputerLinkPath } from "./coworkComputerLink";
import { CoworkOfficialToolRenderer } from "./CoworkOfficialToolRenderer";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

const widgetTools = new Set([
  "AskUserQuestion", "ask_user_free_form_input_v0", "ask_user_input_v0", "image_search",
  "message_compose_v1", "places_map_display_v0", "recipe_display_v0", "recommend_claude_apps", "weather_fetch",
]);

export function CoworkAssistantContentSegment({ hasTextAfter, isLastContent, segment }: {
  hasTextAfter: boolean;
  isLastContent: boolean;
  segment: CoworkContentSegment;
}) {
  const context = useCoworkAssistantRenderContext();
  const actions = useCoworkTranscriptActions();
  // Official ~136785: computer:// → SELECT_FILE + open drawer (toolType create_file).
  const onLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>, url: string) => {
    const path = coworkComputerLinkPath(url);
    if (!path) return;
    event.preventDefault();
    actions?.openFile({ path, toolType: "create_file" });
  }, [actions]);
  if (!shouldRenderContent(segment.blocks, hasTextAfter, context.isThisMessageStreaming)) return null;
  return (
    <>
      {segment.blocks.map((block, index) =>
        renderContentBlock(
          block,
          index,
          context.blocks,
          context,
          isLastContent,
          onLinkClick,
          actions?.openArtifact,
        ),
      )}
    </>
  );
}

export function CoworkContentAfterTimeline({ store, timelineIndex }: {
  store: CoworkAssistantTimelineStore;
  timelineIndex: number;
}) {
  const item = useCoworkTimelineStoreItem(store, timelineIndex);
  if (!item?.contentAfter) return null;
  return (
    <CoworkAssistantContentSegment
      hasTextAfter={item.contentHasTextAfter}
      isLastContent={item.isLastContent}
      segment={item.contentAfter}
    />
  );
}

function renderContentBlock(
  block: CoworkContentBlock,
  index: number,
  allBlocks: CoworkContentBlock[],
  context: ReturnType<typeof useCoworkAssistantRenderContext>,
  isLastContent: boolean,
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void,
  onOpenArtifact?: (artifact: unknown) => void,
) {
  const globalIndex = allBlocks.indexOf(block);
  if (block.type === "text" || block.type === "connector_text") {
    const text = block.type === "text" ? block.text : block.connector_text;
    if (!text) return null;
    const className = context.isThisMessageStreaming ? "progressive-markdown" : "standard-markdown";
    // Official residual: onOpenArtifact only when showArtifacts (preview_feature_uses_artifacts).
    // Missing handler → markdown falls back to plain <antArtifact> text (CoworkMarkdown renderHtml).
    return (
      <CoworkAssistantMarkdown
        blockCitations={Array.isArray(block.citations) ? block.citations : []}
        className={className}
        isStreaming={context.isThisMessageStreaming}
        key={blockKey(block, index)}
        messageUuid={context.message.uuid}
        onLinkClick={onLinkClick}
        onOpenArtifact={onOpenArtifact}
        text={text}
      />
    );
  }
  if (block.type !== "tool_use") return null;
  const nextBlock = globalIndex >= 0 ? allBlocks[globalIndex + 1] : undefined;
  const result = nextBlock?.type === "tool_result" && nextBlock.tool_use_id === block.id ? nextBlock : undefined;
  const isLastBlockOfMessage = globalIndex >= 0 && isLastRenderableBlock(allBlocks, globalIndex);
  const isToolStreaming = context.isStreaming && globalIndex >= allBlocks.length - 1;
  return (
    <CoworkOfficialToolRenderer
      block={block}
      isFirstBlockOfMessage={globalIndex === 0}
      isFirstItem
      isLastBlockOfMessage={isLastBlockOfMessage}
      isLastItem={isLastContent}
      isStreaming={isToolStreaming}
      key={blockKey(block, index)}
      message={context.message}
      standalone
      toolResult={result}
    />
  );
}

function isLastRenderableBlock(blocks: CoworkContentBlock[], index: number) {
  const next = blocks[index + 1];
  return index === blocks.length - 1 - (next?.type === "tool_result" ? 1 : 0);
}

function shouldRenderContent(blocks: CoworkContentBlock[], hasTextAfter: boolean, streaming: boolean) {
  const hasText = blocks.some(hasVisibleText);
  const hasStandaloneTool = blocks.some((block) => block.type === "tool_use" && !widgetTools.has(block.name ?? ""));
  const hasAnsweredQuestion = blocks.some((block) => block.type === "tool_use" && block.name === "AskUserQuestion"
    && Object.keys(block.input?.answers ?? {}).length > 0);
  return hasText || hasTextAfter || !streaming || hasStandaloneTool || hasAnsweredQuestion;
}

function hasVisibleText(block: CoworkContentBlock) {
  return block.type === "text" && Boolean(block.text?.trim())
    || block.type === "connector_text" && Boolean(block.connector_text?.trim());
}

function blockKey(block: CoworkContentBlock, index: number) {
  return block.id ?? block.tool_use_id ?? `${block.type}-${index}`;
}
