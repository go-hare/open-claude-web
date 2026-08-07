/**
 * Official wle/Cle + mle/hle providers for local_session cFt drawer
 * (index-BELzQL5P.pretty.js ~51808–51949).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { useFrameContext } from "../../../../stores/frameContext";
import type { CoworkFileTarget } from "../transcript/CoworkTranscriptActions";
import {
  aggregateCoworkArtifacts,
  type CoworkArtifact,
} from "../transcript/coworkMessageArtifacts";
import { buildCoworkChatMessages } from "../transcript/coworkMessageModel";
import { coworkMessagePathStore } from "../transcript/coworkMessagePathStore";
import type { CoworkStreamSnapshot } from "../stream/coworkStreamTypes";
import type { CoworkRawMessage } from "../types";
import { useCoworkSessionData } from "../useCoworkSessionData";
import {
  initialCoworkChatResourceState,
  isCoworkFileDrawerOpen,
  reduceCoworkChatResource,
  type CoworkChatResourceAction,
  type CoworkChatResourceState,
  type CoworkSelectedBrowserExtensionItem,
  type CoworkSelectedFileItem,
  type CoworkSelectedItem,
  type CoworkSelectedMcpServerItem,
  type CoworkSelectedSkillItem,
  type CoworkStreamingFileEntry,
} from "./coworkChatResourceStore";

type ChatResourceContextValue = {
  chatResourceState: CoworkChatResourceState;
  dispatchChatResource: Dispatch<CoworkChatResourceAction>;
};

type DrawerExpandedContextValue = {
  isDrawerExpanded: boolean;
  setIsDrawerExpanded: (expanded: boolean) => void;
};

const ChatResourceContext = createContext<ChatResourceContextValue | null>(null);
const DrawerExpandedContext = createContext<DrawerExpandedContextValue>({
  isDrawerExpanded: false,
  setIsDrawerExpanded: () => {},
});

export function CoworkChatResourceProvider({
  children,
  conversationUuid,
}: {
  children: ReactNode;
  conversationUuid: string;
}) {
  const [chatResourceState, dispatchChatResource] = useReducer(
    reduceCoworkChatResource,
    conversationUuid,
    initialCoworkChatResourceState,
  );
  const frame = useFrameContext();
  const [isDrawerExpanded, setIsDrawerExpandedState] = useState(() => initialDrawerExpanded(conversationUuid));
  const coordinationRef = useRef({ conversationUuid, reopenMain: false });

  useEffect(() => {
    dispatchChatResource({ type: "RESET", conversationUuid });
    if (coordinationRef.current.conversationUuid !== conversationUuid) {
      coordinationRef.current = { conversationUuid, reopenMain: false };
    }
  }, [conversationUuid]);

  const setIsDrawerExpanded = useCallback(
    (expanded: boolean) => {
      if (frame) {
        if (expanded && !frame.sidebarCollapsed) {
          coordinationRef.current.reopenMain = true;
          frame.setSidebarCollapsed(true);
        } else if (!expanded && coordinationRef.current.reopenMain) {
          coordinationRef.current.reopenMain = false;
          frame.setSidebarCollapsed(false);
        }
      }
      setIsDrawerExpandedState(expanded);
    },
    [frame],
  );

  const resourceValue = useMemo(
    () => ({ chatResourceState, dispatchChatResource }),
    [chatResourceState],
  );
  const drawerValue = useMemo(
    () => ({ isDrawerExpanded, setIsDrawerExpanded }),
    [isDrawerExpanded, setIsDrawerExpanded],
  );

  return (
    <ChatResourceContext.Provider value={resourceValue}>
      <DrawerExpandedContext.Provider value={drawerValue}>{children}</DrawerExpandedContext.Provider>
    </ChatResourceContext.Provider>
  );
}

export function initialDrawerExpanded(conversationUuid: string) {
  if (typeof window === "undefined") return false;
  const key = `${conversationUuid}:chatControlsSidebarIsOpen`;
  const stored = window.localStorage.getItem(key);
  if (stored !== null) {
    try {
      return Boolean(JSON.parse(stored));
    } catch {
      return stored === "true";
    }
  }
  const controls = new URLSearchParams(window.location.search).get("controls");
  const mobile =
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
  return Boolean(controls) && !mobile;
}

/** Official wle() */
export function useCoworkChatResource() {
  const value = useContext(ChatResourceContext);
  if (!value) {
    throw new Error("useCoworkChatResource requires CoworkChatResourceProvider");
  }
  return value;
}

/** Official hle() */
export function useCoworkDrawerExpanded() {
  return useContext(DrawerExpandedContext);
}

export function useCoworkSelectedItem(): CoworkSelectedItem | null {
  const { chatResourceState } = useCoworkChatResource();
  return chatResourceState.selectedItem;
}

/** File-only selected item (null when another cFt type is selected). */
export function useCoworkSelectedFileItem(): CoworkSelectedFileItem | null {
  const selected = useCoworkSelectedItem();
  return selected?.type === "file" ? selected : null;
}

export function useCoworkStreamingFile(path: string | undefined): CoworkStreamingFileEntry | undefined {
  const { chatResourceState } = useCoworkChatResource();
  if (!path) return undefined;
  return chatResourceState.streamingFiles.get(path);
}

export function useCoworkFileDrawerOpen(): boolean {
  const { isDrawerExpanded } = useCoworkDrawerExpanded();
  const selected = useCoworkSelectedItem();
  return isCoworkFileDrawerOpen(isDrawerExpanded, selected);
}

/**
 * Official open path: SELECT_FILE + setIsDrawerExpanded(true).
 * Optional content → UPDATE_STREAMING_FILE (Gzt g?.content short-circuit / click open with file_text).
 */
export function useCoworkOpenFile() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();

  return useCallback(
    (target: CoworkFileTarget) => {
      if (!target.path) return;
      dispatchChatResource({
        type: "SELECT_FILE",
        path: target.path,
        toolType: target.toolType,
        messageId: target.messageId,
        fileUuid: target.fileUuid,
      });
      if (typeof target.content === "string") {
        dispatchChatResource({
          type: "UPDATE_STREAMING_FILE",
          path: target.path,
          content: target.content,
          showingInRightPane: true,
        });
      }
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
}

/** Official activity panel SELECT_MCP_SERVER + expand. */
export function useCoworkOpenMcpServer() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  return useCallback(
    (target: Omit<CoworkSelectedMcpServerItem, "type">) => {
      if (!target.serverUuid) return;
      dispatchChatResource({
        type: "SELECT_MCP_SERVER",
        serverUuid: target.serverUuid,
        serverName: target.serverName,
        iconType: target.iconType,
        iconSrc: target.iconSrc,
      });
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
}

/** Official activity panel SELECT_WEB_SEARCH + expand. */
export function useCoworkOpenWebSearch() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  return useCallback(() => {
    dispatchChatResource({ type: "SELECT_WEB_SEARCH" });
    setIsDrawerExpanded(true);
  }, [dispatchChatResource, setIsDrawerExpanded]);
}

/** Official activity panel SELECT_BROWSER_EXTENSION + expand. */
export function useCoworkOpenBrowserExtension() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  return useCallback(
    (target?: Omit<CoworkSelectedBrowserExtensionItem, "type">) => {
      dispatchChatResource({
        type: "SELECT_BROWSER_EXTENSION",
        highlightId: target?.highlightId,
      });
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
}

/** Official activity panel SELECT_SKILL + expand. */
export function useCoworkOpenSkill() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  return useCallback(
    (target: Omit<CoworkSelectedSkillItem, "type">) => {
      if (!target.skillName) return;
      dispatchChatResource({
        type: "SELECT_SKILL",
        skillName: target.skillName,
        pluginName: target.pluginName,
      });
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
}

/**
 * Official conversation path residual (index-BELzQL5P):
 * `onOpenArtifact: showArtifacts ? gt : void 0` where
 * `showArtifacts = Boolean(ve?.preview_feature_uses_artifacts || ue)`.
 * Opens cFt drawer with SELECT_ARTIFACT (chat g6e) / SELECT_COWORK_ARTIFACT (host disk).
 *
 * Product routing:
 *   - message-level antArtifact / artifacts tool with type+content → SELECT_CHAT_ARTIFACT (b6e/g6e)
 *   - disk cowork artifact id without chat payload → SELECT_COWORK_ARTIFACT (showArtifact)
 */
export function useCoworkOpenArtifact() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  const session = useCoworkSessionData();
  const messagesRef = useRef(session.messages);
  const streamSnapshotRef = useRef(session.streamSnapshot);
  messagesRef.current = session.messages;
  streamSnapshotRef.current = session.streamSnapshot;

  return useCallback(
    (
      artifact:
        | {
            id?: string;
            identifier?: string;
            messageUuid?: string;
            title?: string;
            type?: string;
            language?: string;
            content?: string;
            versions?: Array<{ resultState?: string; content?: string }>;
            source?: string;
          }
        | unknown,
    ) => {
      const record =
        artifact && typeof artifact === "object" ? (artifact as Record<string, unknown>) : {};
      const id =
        (typeof record.id === "string" && record.id)
        || (typeof record.identifier === "string" && record.identifier)
        || "";
      if (!id) return;

      const messageUuid =
        typeof record.messageUuid === "string" ? record.messageUuid : undefined;
      let title = typeof record.title === "string" ? record.title : undefined;
      let artifactType = typeof record.type === "string" ? record.type : undefined;
      let language = typeof record.language === "string" ? record.language : undefined;
      let content = typeof record.content === "string" ? record.content : undefined;
      if (!content && Array.isArray(record.versions) && record.versions.length > 0) {
        const last = record.versions[record.versions.length - 1] as {
          resultState?: string;
          content?: string;
        };
        content =
          (typeof last?.resultState === "string" && last.resultState)
          || (typeof last?.content === "string" && last.content)
          || undefined;
      }

      // Bare id: resolve from path-store aggregates (CoworkChatMessage[]), not raw envelopes.
      // Path store is published by coworkSessionRuntime via buildCoworkChatMessages.
      if ((!content || !artifactType) && record.source !== "cowork_disk") {
        const fromMessages = resolveChatArtifactFromSession(
          id,
          messagesRef.current,
          streamSnapshotRef.current,
        );
        if (fromMessages) {
          const last = fromMessages.versions.at(-1);
          content =
            content
            ?? last?.resultState
            ?? last?.content
            ?? undefined;
          artifactType = artifactType ?? fromMessages.type;
          title = title ?? fromMessages.title;
          language = language ?? fromMessages.language;
        }
      }

      // Prefer Chat g6e when type and/or content exist (payload or message aggregate).
      // Disk-only cowork artifacts typically open with bare id and no aggregate hit.
      const isChatPayload =
        Boolean(artifactType || content)
        && record.source !== "cowork_disk";

      if (isChatPayload) {
        dispatchChatResource({
          type: "SELECT_CHAT_ARTIFACT",
          id,
          messageUuid,
          title,
          artifactType,
          content,
          language,
        });
      } else {
        dispatchChatResource({ type: "SELECT_COWORK_ARTIFACT", id });
      }
      if (messageUuid) {
        dispatchChatResource({ type: "SET_ACTIVE_MESSAGE_UUID", uuid: messageUuid });
      }
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
}

/**
 * Resolve message-level antArtifact / artifacts tool by id.
 * Prefer path store (already aggregated from normalized CoworkChatMessage[]).
 * Fall back to buildCoworkChatMessages + aggregate when path store is cold.
 * Never cast CoworkMessageEnvelope[] → CoworkChatMessage[].
 */
function resolveChatArtifactFromSession(
  id: string,
  messages: CoworkRawMessage[] | undefined,
  streamSnapshot: CoworkStreamSnapshot,
): CoworkArtifact | undefined {
  const pathState = coworkMessagePathStore.getState();
  const fromPath = pathState.streamingArtifacts[id] ?? pathState.artifacts[id];
  if (fromPath) return fromPath;
  if (!messages?.length) return undefined;
  try {
    const chatMessages = buildCoworkChatMessages(messages, streamSnapshot);
    return aggregateCoworkArtifacts(chatMessages)[id];
  } catch {
    return undefined;
  }
}

/** Official Gzt/cFt onClose: clear selection + collapse drawer. */
export function useCoworkCloseFileDrawer() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();

  return useCallback(() => {
    dispatchChatResource({ type: "CLEAR_SELECTED" });
    setIsDrawerExpanded(false);
  }, [dispatchChatResource, setIsDrawerExpanded]);
}
