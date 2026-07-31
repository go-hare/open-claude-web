/**
 * Official ProgressiveStandardMarkDown (chunk c93fb40ec `_e` / export `P`).
 * Gates: claude_ai_alluvium_main, claudeai_streaming_fade_in_main — dynamic only, no static fake defaults.
 * Progressive path uses official Le/Oe line chunker (not AST frontier).
 */
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { AlluviumMarkdown } from "./AlluviumMarkdown";
import {
  CoworkMarkdownTree,
  hasCoworkMarkdownNode,
  parseCoworkMarkdown,
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
    // Official ProgressiveStandardMarkDown → AlluviumMarkDown (`be` / `ae` / `ve`).
    return (
      <AlluviumMarkdown
        className={className}
        headingLevelOffset={headingLevelOffset}
        isStreaming={isStreaming}
        onCodeDetected={onCodeDetected}
        onLinkClick={props.onLinkClick}
        onLinkDetected={props.onLinkDetected}
        text={text}
      />
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

/**
 * Official ProgressiveStandardMarkDown gates:
 *   v("claude_ai_alluvium_main") each render
 *   useState(() => ud("claudeai_streaming_fade_in_main")) latch
 * Product residual order (honest, no static invent defaults):
 *   1) inject evaluator  2) query gb_gate_*  3) localStorage gb_local_overrides
 *   4) bootstrap GrowthBook / feature_flags via readBootstrapFeatureFlag
 */
/** Exported for residual gate tests + CDP verification (no static invent defaults). */
export function evaluateCoworkMarkdownFeature(feature: CoworkMarkdownFeature) {
  const configured = configuredFeatureEvaluator?.(feature);
  if (configured !== undefined) return configured;
  if (typeof window === "undefined") return undefined;
  const query = new URLSearchParams(window.location.search).get(`gb_gate_${feature}`);
  const queryValue = booleanGateValue(query);
  if (queryValue !== undefined) return queryValue;
  try {
    const stored = window.localStorage.getItem("gb_local_overrides");
    const overrides = stored ? JSON.parse(stored) : null;
    if (overrides && typeof overrides === "object" && typeof overrides[feature] === "boolean") {
      return overrides[feature] as boolean;
    }
  } catch {
    /* fall through to bootstrap */
  }
  return readBootstrapMarkdownFeature(feature);
}

function readBootstrapMarkdownFeature(feature: CoworkMarkdownFeature): boolean | undefined {
  try {
    const w = window as unknown as {
      __CLAUDE_BOOTSTRAP__?: Record<string, unknown>;
      __bootstrap?: Record<string, unknown>;
    };
    // Lazy import-free residual: same bag as notificationRowGates.readBootstrapFeatureFlag.
    return readBootstrapFeatureFlagLocal(w.__CLAUDE_BOOTSTRAP__ ?? w.__bootstrap, feature);
  } catch {
    return undefined;
  }
}

function readBootstrapFeatureFlagLocal(
  bootstrap: Record<string, unknown> | null | undefined,
  key: string,
): boolean | undefined {
  if (!bootstrap) return undefined;
  const roots: Array<Record<string, unknown> | null | undefined> = [
    asRecord(bootstrap.feature_flags),
    asRecord(bootstrap.featureFlags),
    asRecord(bootstrap.flags),
    asRecord(asRecord(bootstrap.growthbook)?.features),
    asRecord(asRecord(bootstrap.growthbook)?.feature_flags),
    asRecord(asRecord(bootstrap.statsig)?.values),
  ];
  for (const root of roots) {
    if (!root || !(key in root)) continue;
    const raw = root[key];
    if (typeof raw === "boolean") return raw;
    if (raw === 1 || raw === "true" || raw === "on" || raw === "enabled") return true;
    if (raw === 0 || raw === "false" || raw === "off" || raw === "disabled") return false;
    const nested = asRecord(raw);
    if (nested && "defaultValue" in nested) {
      const dv = nested.defaultValue;
      if (typeof dv === "boolean") return dv;
    }
    if (nested && typeof nested.isAvailable === "boolean") return nested.isAvailable;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function booleanGateValue(value: string | null) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
