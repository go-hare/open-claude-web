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
 * Opens cFt drawer with SELECT_ARTIFACT / SELECT_COWORK_ARTIFACT.
 */
export function useCoworkOpenArtifact() {
  const { dispatchChatResource } = useCoworkChatResource();
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  return useCallback(
    (artifact: { id?: string; identifier?: string; messageUuid?: string } | unknown) => {
      const record =
        artifact && typeof artifact === "object" ? (artifact as Record<string, unknown>) : {};
      const id =
        (typeof record.id === "string" && record.id)
        || (typeof record.identifier === "string" && record.identifier)
        || "";
      if (!id) return;
      dispatchChatResource({ type: "SELECT_COWORK_ARTIFACT", id });
      if (typeof record.messageUuid === "string" && record.messageUuid) {
        dispatchChatResource({ type: "SET_ACTIVE_MESSAGE_UUID", uuid: record.messageUuid });
      }
      setIsDrawerExpanded(true);
    },
    [dispatchChatResource, setIsDrawerExpanded],
  );
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
