/**
 * Official g$t dual residual helpers (pretty ~227328).
 * Channel A: tool `loading_messages` → m$t rotator (when streaming && !statusMessage).
 * Channel B: shouldShowWaitingText → h$t (compaction / api_retry / timed standby).
 * ns = isStreaming && (retryCount || messageCount === 2 || isCompacting || apiRetry).
 * Source: index-BELzQL5P.pretty.js g$t / m$t / h$t / rce.
 */

export const COWORK_TOOL_LOADING_FALLBACK = Symbol("visualize-loading-fallback");

/** Official Je.show ? 220 : undefined — onboarding banner path (ZBt currently hard-false for agent). */
export const COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX = 220;

export type CoworkToolLoadingMessages =
  | readonly string[]
  | typeof COWORK_TOOL_LOADING_FALLBACK
  | undefined;

export type CoworkShouldShowWaitingTextInput = {
  apiRetryActive?: boolean;
  isCompacting?: boolean;
  isStreaming: boolean;
  /** Official path message count `p.length`. */
  messageCount: number;
  /** Official client retryCount `y`. */
  retryCount?: number;
};

/** Official ns gate for h$t. */
export function shouldShowCoworkWaitingText(input: CoworkShouldShowWaitingTextInput): boolean {
  if (!input.isStreaming) return false;
  return Boolean(
    (input.retryCount && input.retryCount > 0) ||
      input.messageCount === 2 ||
      input.isCompacting ||
      input.apiRetryActive,
  );
}

/**
 * Official additionalBuffer for LUt: Je.show ? 220 : void 0.
 * Agent/local_session ZBt forces show=false; keep API for parity only.
 */
export function resolveCoworkOnboardingAdditionalBuffer(showOnboardingBanner: boolean): number | undefined {
  return showOnboardingBanner ? COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX : undefined;
}

/**
 * Official g$t loading_messages from last trailing tool_use (skip after text).
 * s = block.input has keys; a = Qp(block) parsed input (input || partial_json).
 * While !s, show sliced loading_messages; once s, hide (tool input settled).
 * COWORK_TOOL_LOADING_FALLBACK for show_widget / read_me+visualize without input.
 */
export function extractCoworkToolLoadingMessages(
  content: readonly unknown[] | null | undefined,
): CoworkToolLoadingMessages {
  if (!content?.length) return undefined;
  for (let index = content.length - 1; index >= 0; index -= 1) {
    const block = asRecord(content[index]);
    if (stringValue(block.type) === "text" && stringValue(block.text)?.trim()) return undefined;
    if (stringValue(block.type) !== "tool_use") continue;
    const rawInput = block.input && typeof block.input === "object" ? asRecord(block.input) : null;
    const hasSettledInput = Boolean(rawInput && Object.keys(rawInput).length > 0);
    const parsed = parseCoworkToolUseInput(block);
    const loading = parsed.loading_messages;
    if (Array.isArray(loading)) {
      const includeLast =
        hasSettledInput || Object.keys(parsed).some((key) => key > "loading_messages");
      const end = includeLast ? loading.length : Math.max(0, loading.length - 1);
      const messages = loading
        .slice(0, end)
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
      if (messages.length > 0) return hasSettledInput ? undefined : messages;
    }
    const shortName = shortToolName(stringValue(block.name) ?? "");
    if (shortName === "read_me" && (stringValue(block.name) ?? "").includes("visualize")) {
      return COWORK_TOOL_LOADING_FALLBACK;
    }
    if (hasSettledInput) return undefined;
    if (shortName === "show_widget") return COWORK_TOOL_LOADING_FALLBACK;
    return undefined;
  }
  return undefined;
}

/**
 * Official Qp(tool_use): prefer settled input object; else parse partial_json.
 * Partial JSON may be incomplete while streaming — best-effort object recovery.
 */
export function parseCoworkToolUseInput(block: Record<string, unknown>): Record<string, unknown> {
  const input = block.input;
  if (input && typeof input === "object" && !Array.isArray(input) && Object.keys(input as object).length > 0) {
    return input as Record<string, unknown>;
  }
  const partial = typeof block.partial_json === "string" ? block.partial_json : "";
  if (partial) {
    const parsed = tryParseStreamingJsonObject(partial);
    if (parsed) return parsed;
  }
  if (input && typeof input === "object" && !Array.isArray(input)) return input as Record<string, unknown>;
  return {};
}

function tryParseStreamingJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const value = JSON.parse(trimmed);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // incomplete stream: close open braces/brackets for best-effort parse
  }
  for (const candidate of progressiveJsonClosures(trimmed)) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // continue
    }
  }
  return null;
}

function progressiveJsonClosures(text: string): string[] {
  const candidates: string[] = [];
  let openBrace = 0;
  let openBracket = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") inString = true;
    else if (ch === "{") openBrace += 1;
    else if (ch === "}") openBrace = Math.max(0, openBrace - 1);
    else if (ch === "[") openBracket += 1;
    else if (ch === "]") openBracket = Math.max(0, openBracket - 1);
  }
  let suffix = "";
  if (inString) suffix += "\"";
  // drop trailing comma before close
  let base = text.replace(/,\s*$/, "");
  suffix += "]".repeat(openBracket) + "}".repeat(openBrace);
  candidates.push(base + suffix);
  candidates.push(base.replace(/,\s*"[^"]*$/, "") + suffix);
  return candidates;
}

/**
 * Walk raw/session envelopes newest-first for last assistant tool loading_messages.
 * Accepts CoworkRawMessage ({ role, raw }) or chat-shaped ({ sender, content }).
 */
export function extractCoworkLoadingMessagesFromMessages(
  messages: readonly {
    content?: readonly unknown[];
    raw?: unknown;
    role?: string;
    sender?: string;
    type?: string;
  }[],
): CoworkToolLoadingMessages {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const raw = asRecord(message.raw);
    const isAssistant = isAssistantEnvelope(message, raw);
    if (!isAssistant) continue;
    const content = resolveMessageContent(message, raw);
    const found = extractCoworkToolLoadingMessages(content);
    if (found !== undefined) return found;
    break;
  }
  return undefined;
}

function isAssistantEnvelope(
  message: { role?: string; sender?: string; type?: string },
  raw: Record<string, unknown>,
) {
  if (message.role === "assistant" || message.sender === "assistant") return true;
  if (stringValue(message.type) === "assistant" || stringValue(raw.type) === "assistant") return true;
  if (stringValue(raw.sender) === "assistant" || stringValue(raw.role) === "assistant") return true;
  return false;
}

function resolveMessageContent(
  message: { content?: readonly unknown[]; raw?: unknown },
  raw: Record<string, unknown>,
): readonly unknown[] | undefined {
  if (Array.isArray(message.content)) return message.content;
  if (Array.isArray(raw.content)) return raw.content as unknown[];
  const nested = asRecord(raw.message);
  if (Array.isArray(nested.content)) return nested.content as unknown[];
  return undefined;
}

/**
 * Official h$t timed standby copy (not s$t activity).
 * 5s: Gathering… / Contemplating… / Pondering… / Ruminating… (random family)
 * 15s: Still working on it, stand by...
 * 30s: A bit longer, thanks for your patience...
 * Returns undefined before 5s (official starts timers at 5/15/30).
 */
export function coworkStandbyWaitingMessage(elapsedSeconds: number, seed = 0): string | undefined {
  if (elapsedSeconds < 5) return undefined;
  if (elapsedSeconds >= 30) return "A bit longer, thanks for your patience...";
  if (elapsedSeconds >= 15) return "Still working on it, stand by...";
  const pool = COWORK_STANDBY_5S_MESSAGES;
  return pool[Math.abs(seed) % pool.length];
}

export const COWORK_STANDBY_5S_MESSAGES = [
  "Gathering my thoughts, be right there...",
  "Contemplating, stand by...",
  "Pondering, stand by...",
  "Ruminating on it, stand by...",
] as const;

/** Official rce: content length of path index [1] (second message). 0 → allow timed standby. */
export function secondMessageContentLength(
  messages: readonly { content?: readonly unknown[] }[],
): number {
  const second = messages[1];
  if (!second) return 0;
  return Array.isArray(second.content) ? second.content.length : 0;
}

function shortToolName(name: string) {
  if (name.startsWith("mcp__")) {
    const index = name.indexOf("__", 5);
    if (index !== -1) return name.slice(index + 2);
  }
  const colon = name.lastIndexOf(":");
  return colon !== -1 ? name.slice(colon + 1) : name;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
