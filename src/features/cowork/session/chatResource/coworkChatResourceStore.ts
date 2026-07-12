/**
 * Official gle chat-resource reducer for local_session cFt drawer
 * (index-BELzQL5P.pretty.js ~51843–51933).
 * local_session reachable selectedItem types from activity panel (~249120+):
 * file | mcp_server | web_search | browser_extension | skill
 * Cloud-only types (artifact/doc/compass/attachment/ccr) kept as typed actions
 * for parity but not required for local_session activity wiring.
 */

export type CoworkStreamingRenderAs = "markdown" | "code" | string;

export type CoworkStreamingFileEntry = {
  content: string;
  renderAs?: CoworkStreamingRenderAs;
  showingInRightPane: boolean;
};

export type CoworkSelectedFileItem = {
  type: "file";
  path: string;
  toolType?: string;
  messageId?: string;
  fileUuid?: string;
};

export type CoworkSelectedMcpServerItem = {
  type: "mcp_server";
  serverUuid: string;
  serverName?: string;
  iconType?: string;
  iconSrc?: string;
};

export type CoworkSelectedWebSearchItem = {
  type: "web_search";
};

export type CoworkSelectedBrowserExtensionItem = {
  type: "browser_extension";
  highlightId?: string;
};

export type CoworkSelectedSkillItem = {
  type: "skill";
  skillName: string;
  pluginName?: string;
};

export type CoworkSelectedSkillProposalItem = {
  type: "skill_proposal";
  proposal: {
    kind?: string;
    name: string;
    target?: string;
    description?: string;
    skillMd?: string;
  };
};

export type CoworkSelectedCoworkArtifactItem = {
  type: "cowork_artifact";
  id: string;
};

export type CoworkSelectedAttachmentItem = {
  type: "attachment";
  attachment: unknown;
};

export type CoworkSelectedItem =
  | CoworkSelectedFileItem
  | CoworkSelectedMcpServerItem
  | CoworkSelectedWebSearchItem
  | CoworkSelectedBrowserExtensionItem
  | CoworkSelectedSkillItem
  | CoworkSelectedSkillProposalItem
  | CoworkSelectedCoworkArtifactItem
  | CoworkSelectedAttachmentItem;

export type CoworkChatResourceState = {
  conversationUuid?: string;
  selectedItem: CoworkSelectedItem | null;
  streamingFiles: Map<string, CoworkStreamingFileEntry>;
  activeMessageUuid?: string;
};

export type CoworkChatResourceAction =
  | {
      type: "SELECT_FILE";
      path: string;
      toolType?: string;
      messageId?: string;
      fileUuid?: string;
    }
  | {
      type: "SELECT_MCP_SERVER";
      serverUuid: string;
      serverName?: string;
      iconType?: string;
      iconSrc?: string;
    }
  | { type: "SELECT_WEB_SEARCH" }
  | { type: "SELECT_BROWSER_EXTENSION"; highlightId?: string }
  | { type: "SELECT_SKILL"; skillName: string; pluginName?: string }
  | {
      type: "SELECT_SKILL_PROPOSAL";
      proposal: CoworkSelectedSkillProposalItem["proposal"];
    }
  | { type: "SELECT_COWORK_ARTIFACT"; id: string }
  | { type: "SELECT_ATTACHMENT"; attachment: unknown }
  | { type: "CLEAR_SELECTED" }
  | { type: "SET_ACTIVE_MESSAGE_UUID"; uuid?: string }
  | {
      type: "UPDATE_STREAMING_FILE";
      path: string;
      content: string;
      renderAs?: CoworkStreamingRenderAs;
      showingInRightPane?: boolean;
    }
  | { type: "CLEAR_STREAMING_FILE"; path: string }
  | { type: "RESET"; conversationUuid?: string };

export const initialCoworkChatResourceState = (conversationUuid?: string): CoworkChatResourceState => ({
  conversationUuid,
  selectedItem: null,
  streamingFiles: new Map(),
  activeMessageUuid: undefined,
});

/** Official gle reducer (local_session subset + typed cloud actions). */
export function reduceCoworkChatResource(
  state: CoworkChatResourceState,
  action: CoworkChatResourceAction,
): CoworkChatResourceState {
  switch (action.type) {
    case "SELECT_FILE":
      return {
        ...state,
        selectedItem: {
          type: "file",
          path: action.path,
          toolType: action.toolType,
          messageId: action.messageId,
          fileUuid: action.fileUuid,
        },
      };
    case "SELECT_MCP_SERVER":
      return {
        ...state,
        selectedItem: {
          type: "mcp_server",
          serverUuid: action.serverUuid,
          serverName: action.serverName,
          iconType: action.iconType,
          iconSrc: action.iconSrc,
        },
      };
    case "SELECT_WEB_SEARCH":
      return { ...state, selectedItem: { type: "web_search" } };
    case "SELECT_BROWSER_EXTENSION":
      return {
        ...state,
        selectedItem: { type: "browser_extension", highlightId: action.highlightId },
      };
    case "SELECT_SKILL":
      return {
        ...state,
        selectedItem: {
          type: "skill",
          skillName: action.skillName,
          pluginName: action.pluginName,
        },
      };
    case "SELECT_SKILL_PROPOSAL":
      return { ...state, selectedItem: { type: "skill_proposal", proposal: action.proposal } };
    case "SELECT_COWORK_ARTIFACT":
      return { ...state, selectedItem: { type: "cowork_artifact", id: action.id } };
    case "SELECT_ATTACHMENT":
      return { ...state, selectedItem: { type: "attachment", attachment: action.attachment } };
    case "CLEAR_SELECTED":
      return { ...state, selectedItem: null, activeMessageUuid: undefined };
    case "SET_ACTIVE_MESSAGE_UUID":
      return { ...state, activeMessageUuid: action.uuid };
    case "UPDATE_STREAMING_FILE": {
      // Official gle: renderAs from action only (not sticky); showingInRightPane sticky.
      const next = new Map(state.streamingFiles);
      const prev = next.get(action.path);
      next.set(action.path, {
        content: action.content,
        renderAs: action.renderAs,
        showingInRightPane: action.showingInRightPane ?? prev?.showingInRightPane ?? false,
      });
      return { ...state, streamingFiles: next };
    }
    case "CLEAR_STREAMING_FILE": {
      const next = new Map(state.streamingFiles);
      next.delete(action.path);
      return { ...state, streamingFiles: next };
    }
    case "RESET":
      return initialCoworkChatResourceState(action.conversationUuid);
    default:
      return state;
  }
}

/**
 * Official yUt: isDrawerOpen = Boolean(isDrawerExpanded && selectedItem).
 * Any selectedItem type opens the right drawer (cFt), not only file.
 */
export function isCoworkFileDrawerOpen(
  isDrawerExpanded: boolean,
  selectedItem: CoworkSelectedItem | null | undefined,
): boolean {
  return Boolean(isDrawerExpanded && selectedItem);
}

/** @deprecated Prefer CoworkSelectedItem; kept for file-only call sites. */
export type { CoworkSelectedFileItem as CoworkSelectedFileItemAlias };
