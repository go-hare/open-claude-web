/**
 * Official c119 Qj mentionProviders + Ljt mentionState.
 * Query Yw / Jw; agent provider only when agentMentionsEnabled (`draft` && Us).
 * ccd-files from real Le.fetchMentionOptions. SSH host / windows providers stay off.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import {
  OFFICIAL_AGENT_MENTIONS_STALE_TIME,
  OFFICIAL_COMPOSER_MENTION_IDLE,
  OFFICIAL_EPITAXY_AGENTS_QUERY_KEY,
  officialCcdFilesMentionProvider,
  officialEpitaxyAgentsMentionProvider,
  officialUserSourceAgents,
  type OfficialComposerMentionProvider,
  type OfficialComposerMentionState,
  type OfficialSshConfigForMentions,
} from "./officialComposerAgentMentions";
import {
  applyOfficialComposerMentionSelect,
  closeOfficialComposerMention,
} from "./officialComposerMentionSelect";

export function useOfficialComposerMentions(input: {
  agentMentionsEnabled: boolean;
  bridge: LocalSessionsBridge;
  /** Official vm ccd-files when Le.fetchMentionOptions exists. Side chat is not Qj. */
  fileMentionsEnabled?: boolean;
  /** Official `local`===rs && p → Le.setFocusedCwd(p). SSH uses listSSHDirectory instead. */
  focusedCwd?: string | null;
  getEditor: () => Editor | null;
  onAgentMention?: (name: string) => void;
  /** Official Qj `sshConfigForMentions` / `$t`. */
  sshConfigForMentions?: OfficialSshConfigForMentions | null;
}) {
  const {
    agentMentionsEnabled,
    bridge,
    fileMentionsEnabled = false,
    focusedCwd = null,
    getEditor,
    onAgentMention,
    sshConfigForMentions = null,
  } = input;
  const getAgents = bridge.getAgents;
  const { data: userAgents } = useQuery({
    queryKey: OFFICIAL_EPITAXY_AGENTS_QUERY_KEY,
    queryFn: async () => {
      const fn = getAgents;
      return fn ? fn() : [];
    },
    enabled: Boolean(getAgents),
    staleTime: OFFICIAL_AGENT_MENTIONS_STALE_TIME,
    select: officialUserSourceAgents,
  });
  const onAgentMentionRef = useRef(onAgentMention);
  const agentsRef = useRef(userAgents);
  useEffect(() => {
    onAgentMentionRef.current = onAgentMention;
    agentsRef.current = userAgents;
  }, [onAgentMention, userAgents]);

  const fetchMentionOptions = desktopBridge.Resources?.fetchMentionOptions;
  const listSSHDirectory = bridge.listSSHDirectory;
  const providers = useMemo(() => {
    const next: OfficialComposerMentionProvider[] = [];
    if (agentMentionsEnabled) {
      const provider = officialEpitaxyAgentsMentionProvider({
        getAgents,
        getCachedAgents: () => agentsRef.current,
        onAgentMention: (name) => onAgentMentionRef.current?.(name),
      });
      if (provider) next.push(provider);
    }
    if (fileMentionsEnabled) {
      const files = officialCcdFilesMentionProvider({
        fetchMentionOptions,
        listSSHDirectory,
        sshConfigForMentions,
      });
      if (files) next.push(files);
    }
    return next;
  }, [agentMentionsEnabled, fetchMentionOptions, fileMentionsEnabled, getAgents, listSSHDirectory, sshConfigForMentions]);

  useEffect(() => {
    if (!fileMentionsEnabled || !focusedCwd || sshConfigForMentions) return;
    const resources = desktopBridge.Resources;
    void resources?.setFocusedCwd?.(focusedCwd);
    if (resources?.fetchMentionOptions) {
      void resources.fetchMentionOptions("", "files").then(() => undefined, () => undefined);
    }
    return () => {
      void resources?.setFocusedCwd?.(null);
    };
  }, [fileMentionsEnabled, focusedCwd, sshConfigForMentions]);

  const providersRef = useRef(providers);
  providersRef.current = providers;

  const [mentionState, setMentionState] = useState<OfficialComposerMentionState>(
    OFFICIAL_COMPOSER_MENTION_IDLE,
  );
  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  const handleDropdownClose = useCallback(() => {
    closeOfficialComposerMention(getEditor());
    setMentionState(OFFICIAL_COMPOSER_MENTION_IDLE);
  }, [getEditor]);

  const handleMentionSelect = useCallback(
    (id: string) => {
      void applyOfficialComposerMentionSelect({
        editor: getEditor(),
        id,
        onDropdownClose: handleDropdownClose,
        options: mentionStateRef.current.options,
        providers: providersRef.current,
      });
    },
    [getEditor, handleDropdownClose],
  );

  const mentionsEnabled = providers.length > 0;
  const dropdownOpen =
    mentionsEnabled
    && Boolean(mentionState.position)
    && ((mentionState.active && mentionState.options.length > 0) || Boolean(mentionState.isLoading));

  return {
    dropdownOpen,
    handleDropdownClose,
    handleMentionSelect,
    handleStateChange: setMentionState,
    mentionState,
    mentionsEnabled,
    providers,
  };
}
