import { createMessageUuid } from "../../../adapters/desktopBridge/messageUuid";
import type { CoworkSessionsBridge, SendMessageInput } from "../../../adapters/desktopBridge/types";
import {
  officialStreamClear,
  officialStreamFeed,
  officialStreamSubscribe,
} from "../../epitaxy/session/officialStreamSessionStore";
import type { OfficialStreamSnapshot } from "../../epitaxy/officialStreamSmoother";
import {
  organizationUuidFromBootstrap,
} from "../../settings/accountSettingsApi";
import { createPendingCoworkUserMessage } from "./coworkPendingMessages";
import {
  coworkPermissionResolvedId,
  normalizeCoworkPermissionRequest,
} from "./coworkPermissionEvents";
import {
  listInstalledCoworkDirectoryServers,
  lookupCoworkDirectoryServers,
  parseDirectoryEventData,
  searchCoworkDirectoryServers,
} from "./mcp/coworkDirectoryServers";
import {
  parsePluginsEventData,
  searchCoworkPluginsResponse,
  setCoworkPluginOrgUuid,
} from "./mcp/coworkPluginSearch";
import {
  parseSkillsEventData,
  resolveCoworkSlashMenuSkills,
  searchCoworkAddableSkills,
  setCoworkInstalledSlashSkills,
  slashCommandsToSkills,
} from "./mcp/coworkSlashSkills";
import {
  extractRateLimitInfoFromMessageEvent,
  mapCoworkRateLimitInfo,
  scanCoworkTranscriptRateLimit,
} from "./rateLimit/coworkRateLimitMap";
import { applyCoworkRateLimitToStore } from "./rateLimit/coworkRateLimitStore";
import {
  coworkStreamMessage,
  coworkTranscriptMessage,
  isCoworkSessionEvent,
} from "./coworkSessionEvents";
import {
  createInitialCoworkSessionState,
  messageIdentity,
} from "./coworkSessionHydration";
import { reduceCoworkSessionState, type CoworkSessionAction } from "./coworkSessionReducer";
import type { CoworkSessionStore } from "./coworkSessionStore";
import { buildCoworkChatMessages } from "./transcript/coworkMessageModel";
import { coworkMessagePathStore, type CoworkMessagePathStore } from "./transcript/coworkMessagePathStore";
import { applyCoworkCuLockReleasedScroll } from "./transcript/coworkAutoscroll";
import { estimateCoworkStreamTokens } from "./transcript/coworkStreamTranscript";
import { asRecord, stringValue } from "./recordUtils";
import type { CoworkStreamSnapshot } from "./stream/coworkStreamTypes";
import type { CoworkRawMessage } from "./types";

type RuntimeOptions = { bridge: CoworkSessionsBridge; messageStore?: CoworkMessagePathStore; sessionId: string; store: CoworkSessionStore };

export function createCoworkSessionRuntime({ bridge, messageStore = coworkMessagePathStore, sessionId, store }: RuntimeOptions) {
  let data = createInitialCoworkSessionState(sessionId);
  let disposed = false;
  let hydrating = true;
  let reloadPromise: Promise<void> | null = null;
  let removeEventListener: (() => void) | undefined;
  let removeStreamSubscribe: (() => void) | undefined;
  const bufferedEvents: unknown[] = [];
  const seenMessageUuids = new Set<string>();

  const publish = () => {
    const chatMessages = buildCoworkChatMessages(data.messages, data.streamSnapshot, { pendingMessages: data.pendingMessages });
    messageStore.getState().setMessages(sessionId, chatMessages);
    // Official Qke(bucket): pendingTurn != null && !endTurnSeen.
    // isRunning alone is not enough after end_turn (turn still open until result).
    const isResponding = data.pendingTurn !== null && !data.pendingTurn.endTurnSeen;
    store.setState({
      sessionContext: {
        ...data,
        isResponding,
        messageUuids: chatMessages.map((message) => message.uuid),
        reload,
        setPermissionRequests,
        streamTokenEstimate: estimateCoworkStreamTokens(data.streamSnapshot),
        submitMessage,
      },
    });
  };

  const dispatch = (action: CoworkSessionAction) => {
    if (disposed) return;
    data = reduceCoworkSessionState(data, action);
    publish();
  };

  /** Official Oke → Va: map zE blocks into CoworkStreamSnapshot shape. */
  const onOfficialStreamSnapshot = (snapshot: OfficialStreamSnapshot) => {
    if (disposed) return;
    if (snapshot === null) {
      dispatch({ snapshot: null, type: "stream-snapshot" });
      return;
    }
    const mapped: NonNullable<CoworkStreamSnapshot> = {
      apiMessageId: snapshot.messageId,
      blocks: snapshot.blocks.map((block) => {
        if (block.kind === "tool") return { id: block.id, kind: "tool" as const, name: block.name, partialJson: block.partialJson };
        if (block.kind === "thinking") return { kind: "thinking" as const, text: block.text };
        return { kind: "text" as const, text: block.text };
      }),
      messageId: snapshot.messageId,
    };
    dispatch({ snapshot: mapped, type: "stream-snapshot" });
  };

  async function reload() {
    if (reloadPromise) return reloadPromise;
    reloadPromise = hydrate().finally(() => {
      reloadPromise = null;
    });
    return reloadPromise;
  }

  async function hydrate() {
    hydrating = true;
    dispatch({ type: "hydration-started" });
    try {
      const transcriptPromise = bridge.getRawTranscript(sessionId).catch(() => []);
      const sessionPromise = bridge.getRawSession(sessionId);
      const [transcript, session] = await Promise.all([transcriptPromise, sessionPromise]);
      if (disposed) return;
      dispatch({ session, transcript, type: "hydration-succeeded" });
      resetSeenMessages(data.messages);
      // Official seedTranscript / Tke.scanTranscript (~71625).
      applyScannedTranscriptRateLimit(transcript);
    } catch (caught) {
      dispatch({ error: caught instanceof Error ? caught : new Error(String(caught)), type: "hydration-failed" });
    } finally {
      if (!disposed) drainBufferedEvents();
    }
  }

  async function submitMessage(text: string, input?: SendMessageInput) {
    if (!bridge.sendMessage) throw new Error("Cowork session bridge cannot send messages");
    const messageUuid = input?.messageUuid ?? createMessageUuid();
    const pending = createPendingCoworkUserMessage(sessionId, messageUuid, text);
    dispatch({ message: pending, startedAt: Date.now(), type: "pending-message-added" });
    try {
      await bridge.sendMessage(sessionId, text, { ...input, messageUuid });
    } catch (caught) {
      dispatch({ messageUuid, type: "pending-message-failed" });
      throw caught;
    }
  }

  function setPermissionRequests(
    value: typeof data.toolPermissionRequests | ((current: typeof data.toolPermissionRequests) => typeof data.toolPermissionRequests),
  ) {
    const requests = typeof value === "function" ? value(data.toolPermissionRequests) : value;
    dispatch({ requests, type: "permissions-replaced" });
  }

  function onBridgeEvent(event: unknown) {
    const permissionRequest = normalizeCoworkPermissionRequest(event, sessionId);
    const isSessionEvent = isCoworkSessionEvent(event, sessionId);
    if (!permissionRequest && !isSessionEvent) return;
    if (hydrating) bufferedEvents.push(event);
    else applyEvent(event);
  }

  function drainBufferedEvents() {
    hydrating = false;
    const queued = bufferedEvents.splice(0);
    for (const event of queued) applyEvent(event);
  }

  function applyEvent(event: unknown) {
    if (applyPermissionEvent(event)) return;
    // Official D1e ~113478: nested rate_limit_event in message envelope OR top-level.
    if (applyRateLimitEvent(event)) return;
    const raw = asRecord(event);
    const type = stringValue(raw.type);
    if (type === "cleared") {
      officialStreamClear(sessionId);
      void reload();
      return;
    }
    if (type === "message") applyMessageEvent(event);
    else if (type === "error") applyErrorEvent(raw);
    // Official LocalAgentModeSessions settle on close/result/error — not synthetic "completed".
    else if (type === "close" || type === "stopped") settleSession(raw);
    else if (type === "pty_close") void refreshTranscript();
    else if (type === "session_updated" || type === "permission_mode_changed") void refreshSessionMetadata();
    // Official D1e / list stores: archived marks isArchived (not full hydrate).
    else if (type === "archived") {
      officialStreamClear(sessionId);
      dispatch({ type: "session-archived" });
    }
    // Official D1e ~113624–113662: Me Map upsert/delete for activity fs_detected merge.
    else if (type === "fs_file_created" || type === "fs_file_modified") applyFsFileUpsert(raw);
    else if (type === "fs_file_deleted") applyFsFileDeleted(raw);
    // Official D1e ~113664: directory_servers_* reverse-RPC → respondDirectoryServers.
    else if (
      type === "directory_servers_search" ||
      type === "directory_servers_lookup" ||
      type === "directory_servers_list_installed"
    ) {
      void applyDirectoryServersEvent(type, raw);
    }
    // Official D1e ~113738: addable_skills_search / slash_menu_skills_resolve → respondSlashMenuSkills.
    else if (
      type === "addable_skills_search" ||
      type === "slash_menu_skills_resolve"
    ) {
      void applySlashSkillsEvent(type, raw);
    }
    // Official D1e ~113756: plugins_search → respondPluginSearch.
    else if (type === "plugins_search") {
      void applyPluginsSearchEvent(raw);
    }
    else if (type === "initialization_status") applyInitializationStatus(raw);
    else if (type === "prompt_suggestion") dispatch({ suggestion: stringValue(raw.data) ?? null, type: "prompt-suggestion" });
    // Official D1e ~114004: cu_lock_released → rAF scroll [data-autoscroll-container] to bottom.
    else if (type === "cu_lock_released") {
      applyCoworkCuLockReleasedScroll({
        eventSessionId: stringValue(raw.sessionId),
        sessionId,
      });
    }
  }

  function applyRateLimitEvent(event: unknown): boolean {
    const info = extractRateLimitInfoFromMessageEvent(event);
    if (!info) return false;
    const mapped = mapCoworkRateLimitInfo(info);
    const orgUuid = resolveCoworkOrgUuid();
    applyCoworkRateLimitToStore(mapped, { orgUuid, sessionId });
    return true;
  }

  function resolveCoworkOrgUuid(): string | null {
    try {
      const w = window as unknown as {
        __CLAUDE_BOOTSTRAP__?: Record<string, unknown>;
        __bootstrap?: Record<string, unknown>;
      };
      return (
        organizationUuidFromBootstrap(w.__CLAUDE_BOOTSTRAP__) ??
        organizationUuidFromBootstrap(w.__bootstrap) ??
        null
      );
    } catch {
      return null;
    }
  }

  async function applyDirectoryServersEvent(
    type:
      | "directory_servers_search"
      | "directory_servers_lookup"
      | "directory_servers_list_installed",
    raw: Record<string, unknown>,
  ) {
    const respond = bridge.respondDirectoryServers;
    if (!respond) return;
    const { requestId, keywords, uuids } = parseDirectoryEventData(raw.data);
    if (!requestId) return;
    try {
      let servers: unknown[] = [];
      if (type === "directory_servers_search") {
        servers = await searchCoworkDirectoryServers(keywords);
      } else if (type === "directory_servers_lookup") {
        servers = await lookupCoworkDirectoryServers(uuids);
      } else {
        servers = listInstalledCoworkDirectoryServers(keywords);
      }
      await respond(requestId, servers);
    } catch {
      await respond(requestId, []).catch(() => undefined);
    }
  }

  async function hydrateInstalledSlashSkillsIfNeeded() {
    if (!bridge.getSupportedCommands) return;
    try {
      const commands = await bridge.getSupportedCommands({ sessionId });
      if (Array.isArray(commands) && commands.length > 0) {
        setCoworkInstalledSlashSkills(slashCommandsToSkills(commands));
      }
    } catch {
      /* keep existing catalog */
    }
  }

  async function applySlashSkillsEvent(
    type: "addable_skills_search" | "slash_menu_skills_resolve",
    raw: Record<string, unknown>,
  ) {
    const respond = bridge.respondSlashMenuSkills;
    if (!respond) return;
    const { requestId, keywords, skillNames } = parseSkillsEventData(raw.data);
    if (!requestId) return;
    try {
      if (type === "slash_menu_skills_resolve") {
        await hydrateInstalledSlashSkillsIfNeeded();
      }
      const skills =
        type === "addable_skills_search"
          ? searchCoworkAddableSkills(keywords)
          : resolveCoworkSlashMenuSkills(skillNames, keywords);
      await respond(requestId, JSON.stringify(skills));
    } catch {
      await respond(requestId, "[]").catch(() => undefined);
    }
  }

  async function applyPluginsSearchEvent(raw: Record<string, unknown>) {
    const respond = bridge.respondPluginSearch;
    if (!respond) return;
    const {
      requestId,
      keywords,
      userIntent,
      includeInstalled,
      listInstalledOnly,
    } = parsePluginsEventData(raw.data);
    if (!requestId) return;
    try {
      setCoworkPluginOrgUuid(resolveCoworkOrgUuid());
      const payload = searchCoworkPluginsResponse({
        keywords,
        userIntent,
        includeInstalled,
        listInstalledOnly,
      });
      await respond(requestId, payload);
    } catch {
      await respond(requestId, JSON.stringify({ results: [] })).catch(
        () => undefined,
      );
    }
  }

  function applyFsFileUpsert(raw: Record<string, unknown>) {
    const fsFile = asRecord(raw.fsFile);
    const hostPath = stringValue(fsFile.hostPath);
    const fileName = stringValue(fsFile.fileName);
    const timestamp = typeof fsFile.timestamp === "number" ? fsFile.timestamp : Date.now();
    if (!hostPath || !fileName) return;
    dispatch({
      file: { fileName, hostPath, timestamp },
      type: "fs-file-upserted",
    });
  }

  function applyFsFileDeleted(raw: Record<string, unknown>) {
    const hostPath = stringValue(asRecord(raw.fsFile).hostPath);
    if (!hostPath) return;
    dispatch({ hostPath, type: "fs-file-deleted" });
  }

  function applyPermissionEvent(event: unknown) {
    const resolvedId = coworkPermissionResolvedId(event, sessionId);
    if (resolvedId) {
      dispatch({ requestId: resolvedId, type: "permission-resolved" });
      return true;
    }
    const request = normalizeCoworkPermissionRequest(event, sessionId);
    if (!request) return false;
    dispatch({ request, type: "permission-upserted" });
    return true;
  }

  function applyMessageEvent(event: unknown) {
    const streamMessage = coworkStreamMessage(event);
    if (streamMessage) {
      // Official Pke.feed(sessionId, event, parent_tool_use_id) — zE owns typewriter.
      const parentToolUseId = streamMessage.parent_tool_use_id ?? streamMessage.parentToolUseId;
      officialStreamFeed(sessionId, streamMessage, parentToolUseId);
      // Activity / streamingMessageId only — blocks come from stream-snapshot (Oke).
      dispatch({ message: streamMessage, startedAt: Date.now(), type: "stream-event" });
      return;
    }
    const message = coworkTranscriptMessage(event);
    if (!message) {
      const messageType = stringValue(asRecord(asRecord(event).message).type);
      if (messageType === "result" || messageType === "error") settleSession(asRecord(event));
      return;
    }
    const uuid = messageIdentity(message);
    if (seenMessageUuids.has(uuid)) return;
    seenMessageUuids.add(uuid);
    dispatch({ message, receivedAt: Date.now(), type: "transcript-message" });
  }

  function applyErrorEvent(raw: Record<string, unknown>) {
    const message = stringValue(raw.error) ?? stringValue(raw.message) ?? "Cowork session failed";
    const errorCategory = stringValue(raw.errorCategory) ?? stringValue(raw.error_category);
    officialStreamClear(sessionId);
    dispatch({ error: new Error(message), errorCategory, type: "runtime-error" });
  }

  function settleSession(raw: Record<string, unknown>) {
    // Official result/done/error → Pke.clear (null Va); not message_stop.
    officialStreamClear(sessionId);
    dispatch({ disconnected: raw.code === 1, type: "settled" });
  }

  function applyInitializationStatus(raw: Record<string, unknown>) {
    const source = asRecord(raw.initializationStatus);
    if (!Object.keys(source).length) return;
    const status = {
      ...(typeof source.isComplete === "boolean" ? { isComplete: source.isComplete } : {}),
      ...(typeof source.message === "string" ? { message: source.message } : {}),
      ...(typeof source.step === "string" ? { step: source.step } : {}),
    };
    dispatch({ receivedAt: Date.now(), status, type: "initialization-status" });
  }

  async function refreshSessionMetadata() {
    const session = await bridge.getRawSession(sessionId).catch(() => null);
    if (!session || disposed) return;
    dispatch({ session, type: "metadata-refreshed" });
  }

  async function refreshTranscript() {
    const transcript = await bridge.getRawTranscript(sessionId).catch(() => null);
    if (!transcript || disposed) return;
    dispatch({ transcript, type: "transcript-refreshed" });
    resetSeenMessages(data.messages);
    // Official reseedTranscript / appendTail also call Tke.scanTranscript (~71652/71715).
    applyScannedTranscriptRateLimit(transcript);
  }

  /** Official Tke.scanTranscript → xI(org) when non-within with future resetsAt. */
  function applyScannedTranscriptRateLimit(transcript: unknown) {
    const scanned = scanCoworkTranscriptRateLimit(
      Array.isArray(transcript) ? transcript : [],
    );
    if (!scanned) return;
    applyCoworkRateLimitToStore(scanned, {
      orgUuid: resolveCoworkOrgUuid(),
      sessionId,
    });
  }

  function resetSeenMessages(messages: CoworkRawMessage[]) {
    seenMessageUuids.clear();
    for (const message of messages) seenMessageUuids.add(messageIdentity(message));
  }
  function start() {
    publish();
    // Official Pe.subscribe(sessionId, Oke) → local Va (stream-snapshot).
    removeStreamSubscribe = officialStreamSubscribe(sessionId, onOfficialStreamSnapshot);
    removeEventListener = bridge.onEvent?.(onBridgeEvent);
    void reload();
  }
  function dispose() {
    disposed = true;
    removeEventListener?.();
    removeStreamSubscribe?.();
    officialStreamClear(sessionId);
  }

  return { dispose, reload, start, submitMessage };
}
