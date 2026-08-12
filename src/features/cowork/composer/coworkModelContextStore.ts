/**
 * Official MCP App model-context residual (index-BELzQL5P):
 * - $7 / V7: gate `claudeai_mcp_a6k_enabled` (ud)
 * - Kte: zustand statesByConversation[conversation][toolName] → { tool_name, content }
 * - Gte / Wte: token estimate + ModelContextTooLargeError (~16k, check floor(17600))
 * - Zte(conversationUuid): live Object.values for composer tool_states
 * - Yte(conversationUuid, toolName): bound updateModelContext for ui/update-model-context host
 *
 * Local Cowork sendMessage arg6 is toolStates (desktop camelCase) ← residual tool_states.
 * Desktop then sets session.widgetToolStates for appendWidgetContextHint.
 *
 * Honest non-goal: Chat DirectFilestore B0.prepareUpload (prepare-upload API) — not
 * toolStates producer; not invent full filestore upload rewrite here.
 */
import { useMemo } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { CoworkToolState, CoworkToolStateContent } from "../../../adapters/desktopBridge/types";

/** Official $7. */
export const COWORK_MCP_A6K_FEATURE_GATE = "claudeai_mcp_a6k_enabled";

/** Official Gte maxTokens display value (16e3). Check uses Math.floor(17600). */
export const COWORK_MODEL_CONTEXT_MAX_TOKENS = 16_000;
export const COWORK_MODEL_CONTEXT_TOKEN_CHECK = Math.floor(17_600);

export type CoworkModelContextContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export type CoworkModelContextTooLargeError = Error & {
  maxTokens: number;
  name: "ModelContextTooLargeError";
  tokens: number;
  toolName: string;
};

export function isCoworkModelContextTooLargeError(
  value: unknown,
): value is CoworkModelContextTooLargeError {
  return Boolean(
    value
    && typeof value === "object"
    && (value as { name?: string }).name === "ModelContextTooLargeError",
  );
}

export function createCoworkModelContextTooLargeError(
  toolName: string,
  tokens: number,
  maxTokens = COWORK_MODEL_CONTEXT_MAX_TOKENS,
): CoworkModelContextTooLargeError {
  const error = new Error(
    `Model context for '${toolName}' exceeds maximum size. Current: ~${tokens} tokens, limit: ${maxTokens} tokens.`,
  ) as CoworkModelContextTooLargeError;
  error.name = "ModelContextTooLargeError";
  error.toolName = toolName;
  error.tokens = tokens;
  error.maxTokens = maxTokens;
  return error;
}

/**
 * Official V7 → ud($7). Product has no GrowthBook client: query/localStorage
 * `gb_gate_claudeai_mcp_a6k_enabled` force (same pattern as options.ts gates).
 */
export function isCoworkMcpA6kEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const key = COWORK_MCP_A6K_FEATURE_GATE;
    const query = params.get(`gb_gate_${key}`) ?? params.get(key);
    if (query === "1" || query === "true") return true;
    if (query === "0" || query === "false") return false;
    const stored = window.localStorage.getItem(`gb_gate_${key}`) ?? window.localStorage.getItem(key);
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}

/** Official text token residual: floor(utf8Bytes / 4.5). */
export function estimateCoworkModelContextTextTokens(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  return Math.floor(bytes / 4.5);
}

/**
 * Official Wte residual (image):
 *   natural dims → ceil(w/28)*ceil(h/28)+2
 *   else floor(base64.length/4.5)+2
 * Node/tests: no Image → base64 length path.
 */
export async function estimateCoworkModelContextImageTokens(
  data: string,
  mimeType: string,
): Promise<number> {
  const fallback = Math.floor(data.length / 4.5) + 2;
  if (typeof Image === "undefined") return fallback;
  const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      } else {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = `data:${mimeType};base64,${data}`;
  });
  if (!dims) return fallback;
  return Math.ceil(dims.width / 28) * Math.ceil(dims.height / 28) + 2;
}

export async function estimateCoworkModelContextTokens(
  blocks: CoworkModelContextContentBlock[],
): Promise<number> {
  let total = 0;
  for (const block of blocks) {
    if (block.type === "text") {
      total += estimateCoworkModelContextTextTokens(block.text);
    } else if (block.type === "image") {
      total += await estimateCoworkModelContextImageTokens(block.data, block.mimeType);
    }
  }
  return total;
}

/** Map host ui/update-model-context content → CoworkToolStateContent residual. */
export function mapCoworkModelContextBlocksToToolContent(
  blocks: CoworkModelContextContentBlock[],
): CoworkToolStateContent[] {
  return blocks.flatMap((block) => {
    if (block.type === "text") return [{ type: "text", text: block.text }];
    if (block.type === "image") {
      return [{ type: "image", data: block.data, media_type: block.mimeType }];
    }
    return [];
  });
}

type ModelContextStoreState = {
  clearConversationStates: (conversationUuid: string) => void;
  getModelContextStates: (conversationUuid: string) => CoworkToolState[];
  statesByConversation: Record<string, Record<string, CoworkToolState>>;
  updateModelContext: (
    conversationUuid: string,
    toolName: string,
    content: CoworkModelContextContentBlock[],
  ) => Promise<void>;
};

function createCoworkModelContextStore() {
  return createStore<ModelContextStoreState>((set, get) => ({
    statesByConversation: {},
    updateModelContext: async (conversationUuid, toolName, content) => {
      const tokens = await estimateCoworkModelContextTokens(content);
      if (tokens > COWORK_MODEL_CONTEXT_TOKEN_CHECK) {
        throw createCoworkModelContextTooLargeError(toolName, tokens);
      }
      const mapped = mapCoworkModelContextBlocksToToolContent(content);
      set((state) => {
        const prev = state.statesByConversation[conversationUuid] ?? {};
        return {
          statesByConversation: {
            ...state.statesByConversation,
            [conversationUuid]: {
              ...prev,
              [toolName]: { tool_name: toolName, content: mapped },
            },
          },
        };
      });
    },
    getModelContextStates: (conversationUuid) => {
      const bucket = get().statesByConversation[conversationUuid];
      return bucket ? Object.values(bucket) : [];
    },
    clearConversationStates: (conversationUuid) => {
      set((state) => {
        const { [conversationUuid]: _removed, ...rest } = state.statesByConversation;
        return { statesByConversation: rest };
      });
    },
  }));
}

/** Module singleton — official Kte. */
export const coworkModelContextStore = createCoworkModelContextStore();

/** Official Yte residual: bound updater or no-op when ids missing. */
export function createCoworkUpdateModelContext(
  conversationUuid: string | undefined | null,
  toolName: string | undefined | null,
): (content: CoworkModelContextContentBlock[]) => Promise<void> {
  if (!conversationUuid || !toolName) {
    return async () => undefined;
  }
  return async (content) => {
    await coworkModelContextStore.getState().updateModelContext(conversationUuid, toolName, content);
  };
}

/**
 * Official Zte residual (without react-zustand selector sugar):
 * read tool states for conversation; empty when uuid missing.
 */
export function getCoworkModelContextToolStates(
  conversationUuid: string | undefined | null,
): CoworkToolState[] {
  if (!conversationUuid) return [];
  return coworkModelContextStore.getState().getModelContextStates(conversationUuid);
}

/**
 * Official composer path: `rt = V7()`, `it = Zte(rt ? conversationUuid : void 0)`,
 * send with `tool_states: rt && it.length > 0 ? it : void 0`.
 */
export function resolveCoworkComposerToolStates(
  conversationUuid: string | undefined | null,
  options?: { a6kEnabled?: boolean },
): CoworkToolState[] | undefined {
  const enabled = options?.a6kEnabled ?? isCoworkMcpA6kEnabled();
  if (!enabled || !conversationUuid) return undefined;
  const states = getCoworkModelContextToolStates(conversationUuid);
  return states.length > 0 ? states : undefined;
}

/** React hook: live Zte when a6k gate on (props.toolStates may still override). */
export function useCoworkModelContextToolStates(
  conversationUuid: string | undefined | null,
): CoworkToolState[] | undefined {
  const a6k = isCoworkMcpA6kEnabled();
  const states = useStore(coworkModelContextStore, (state) => {
    if (!a6k || !conversationUuid) return EMPTY_TOOL_STATES;
    const bucket = state.statesByConversation[conversationUuid];
    return bucket ? Object.values(bucket) : EMPTY_TOOL_STATES;
  });
  return useMemo(() => {
    if (!a6k || !conversationUuid || states.length === 0) return undefined;
    return states;
  }, [a6k, conversationUuid, states]);
}

const EMPTY_TOOL_STATES: CoworkToolState[] = [];
