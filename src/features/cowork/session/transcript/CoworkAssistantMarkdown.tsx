/**
 * Official ProgressiveStandardMarkDown (chunk c93fb40ec `_e` / export `P`).
 * Gates: claude_ai_alluvium_main, claudeai_streaming_fade_in_main — dynamic only, no static fake defaults.
 * Progressive path uses official Le/Oe line chunker (not AST frontier).
 */
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  CoworkMarkdownTree,
  hasCoworkMarkdownNode,
  parseCoworkMarkdown,
  partitionCoworkMarkdown,
} from "./CoworkMarkdown";
import { computeCoworkProgressiveMarkdownChunks } from "./coworkProgressiveMarkdown";

export type CoworkMarkdownFeature = "claude_ai_alluvium_main" | "claudeai_streaming_fade_in_main";
export type CoworkMarkdownFeatureEvaluator = (feature: CoworkMarkdownFeature) => boolean | undefined;

export type CoworkAssistantMarkdownProps = {
  blockCitations?: readonly unknown[];
  className?: string;
  featureEvaluator?: CoworkMarkdownFeatureEvaluator;
  headingLevelOffset?: number;
  isStreaming?: boolean;
  messageUuid?: string;
  onCodeDetected?: () => void;
  onFirstPaint?: () => void;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onLinkDetected?: () => void;
  onOpenArtifact?: (artifact: unknown) => void;
  text: string;
};

let configuredFeatureEvaluator: CoworkMarkdownFeatureEvaluator | undefined;

export function configureCoworkMarkdownFeatureEvaluator(evaluator?: CoworkMarkdownFeatureEvaluator) {
  configuredFeatureEvaluator = evaluator;
}

export function CoworkAssistantMarkdown(props: CoworkAssistantMarkdownProps) {
  const {
    className,
    featureEvaluator = evaluateCoworkMarkdownFeature,
    headingLevelOffset = 1,
    isStreaming = false,
    onCodeDetected,
    onFirstPaint,
    onLinkDetected,
    text,
  } = props;
  const root = useMemo(() => parseCoworkMarkdown(text), [text]);
  // Official: v("claude_ai_alluvium_main") each render; fade latched once via useState.
  const alluviumEnabled = featureEvaluator("claude_ai_alluvium_main") === true;
  const [streamingFadeEnabled] = useState(() => featureEvaluator("claudeai_streaming_fade_in_main") === true);
  // Official Oe only runs progressive when streaming && !alluvium && !fade.
  const progressiveActive = isStreaming && !alluviumEnabled && !streamingFadeEnabled;
  const progressive = useMemo(
    () => computeCoworkProgressiveMarkdownChunks(text, progressiveActive),
    [progressiveActive, text],
  );

  useEffect(() => {
    onFirstPaint?.();
  }, [onFirstPaint, text]);
  useEffect(() => {
    if (onLinkDetected && hasCoworkMarkdownNode(root, new Set(["link", "linkReference"]))) onLinkDetected();
  }, [onLinkDetected, root]);
  useEffect(() => {
    if (onCodeDetected && hasCoworkMarkdownNode(root, new Set(["code", "inlineCode"]))) onCodeDetected();
  }, [onCodeDetected, root]);

  if (alluviumEnabled) {
    // Residual: full official AlluviumMarkDown (ae incremental) not ported; keep class + AST frontier stand-in.
    const parts = isStreaming ? partitionCoworkMarkdown(root, text) : { committed: [root], frontier: null };
    return (
      <div className={classes("alluvium-markdown", className)}>
        {parts.committed.map((chunk, index) => (
          <CoworkMarkdownTree {...treeProps(props, headingLevelOffset)} key={`committed-${index}`} profile="assistant" root={chunk} source={text} />
        ))}
        {parts.frontier ? (
          <CoworkMarkdownTree {...treeProps(props, headingLevelOffset)} profile="assistant" root={parts.frontier} source={text} />
        ) : null}
      </div>
    );
  }

  if (streamingFadeEnabled) {
    // Official: single StandardMarkdown with useStreamingFadeIn:true (fade CSS path).
    return (
      <div className={className} data-streaming-fade={isStreaming || undefined}>
        <CoworkMarkdownTree {...treeProps(props, headingLevelOffset)} profile="assistant" root={root} source={text} />
      </div>
    );
  }

  const { completedChunks, streamingChunk } = progressive;
  // Official: if single completed chunk and no streaming remainder → standard (non-progressive) shell.
  if (completedChunks.length === 1 && !streamingChunk) {
    return (
      <div className={className}>
        <CoworkMarkdownTree {...treeProps(props, headingLevelOffset)} profile="assistant" root={root} source={text} />
      </div>
    );
  }

  return (
    <div className={classes("progressive-markdown", className)}>
      {completedChunks.map((chunk, index) => {
        // Official MemoizedMarkdownChunk: index>0 prefixes "\n\n" so source offsets stay stable.
        const chunkText = index > 0 ? `\n\n${chunk}` : chunk;
        return (
          <CoworkMarkdownTree
            {...treeProps(props, headingLevelOffset)}
            key={`chunk-${index}`}
            profile="assistant"
            root={parseCoworkMarkdown(chunkText)}
            source={chunkText}
          />
        );
      })}
      {streamingChunk ? (() => {
        const streamText = completedChunks.length > 0 ? `\n\n${streamingChunk}` : streamingChunk;
        return (
          <CoworkMarkdownTree
            {...treeProps(props, headingLevelOffset)}
            profile="assistant"
            root={parseCoworkMarkdown(streamText)}
            source={streamText}
          />
        );
      })() : null}
    </div>
  );
}

function treeProps(props: CoworkAssistantMarkdownProps, headingLevelOffset: number) {
  return {
    blockCitations: props.blockCitations,
    headingLevelOffset,
    messageUuid: props.messageUuid,
    onLinkClick: props.onLinkClick,
    onOpenArtifact: props.onOpenArtifact,
  };
}

function evaluateCoworkMarkdownFeature(feature: CoworkMarkdownFeature) {
  const configured = configuredFeatureEvaluator?.(feature);
  if (configured !== undefined) return configured;
  if (typeof window === "undefined") return undefined;
  const query = new URLSearchParams(window.location.search).get(`gb_gate_${feature}`);
  const queryValue = booleanGateValue(query);
  if (queryValue !== undefined) return queryValue;
  try {
    const stored = window.localStorage.getItem("gb_local_overrides");
    const overrides = stored ? JSON.parse(stored) : null;
    return overrides && typeof overrides === "object" && typeof overrides[feature] === "boolean"
      ? overrides[feature]
      : undefined;
  } catch {
    return undefined;
  }
}

function booleanGateValue(value: string | null) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
