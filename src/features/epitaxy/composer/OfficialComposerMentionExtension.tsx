/**
 * Official index-BELz `_jt` mentionExtension + `Ejt` mention node (Qj / vTt).
 * PluginKey "mention". Trigger `(?:^|\s)@(\S*)$`.
 * Enter/Arrow/Escape while active; onSelect(option.id).
 */
import { useState } from "react";
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  ContextMenu,
} from "../../../shell/BaseMenu";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { COMPOSER_MENTION_CHIP_MESSAGES } from "../officialCodeChromeMessages";
import type {
  OfficialComposerMentionOption,
  OfficialComposerMentionProvider,
  OfficialComposerMentionState,
} from "./officialComposerAgentMentions";
import { OFFICIAL_COMPOSER_MENTION_IDLE } from "./officialComposerAgentMentions";

export const officialComposerMentionPluginKey = new PluginKey("mention");

const OFFICIAL_MENTION_TRIGGER = /(?:^|\s)@(\S*)$/;

type OfficialMentionExtensionOptions = {
  getProviders: () => OfficialComposerMentionProvider[];
  onSelect: (id: string) => void;
  onStateChange: (state: OfficialComposerMentionState) => void;
};

function OfficialMentionChipNodeView({ deleteNode, editor, node, selected }: NodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const copy = useI18nText(COMPOSER_MENTION_CHIP_MESSAGES);
  const label = String(node.attrs.label || "");
  const rendered = String(node.attrs.renderedText || label);
  return (
    <NodeViewWrapper
      as="span"
      className={`inline-flex relative cursor-pointer group mx-0.5 ${selected ? "text-accent-000" : "text-accent-100"}`}
      contentEditable={false}
      data-drag-handle=""
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(event) => {
        if (event.button !== 0) event.stopPropagation();
      }}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <span {...props} className="inline-flex relative">
              <span
                className={`absolute -inset-y-0.5 -left-0.5 -right-1 rounded-md pointer-events-none ${selected ? "bg-accent-900" : hovered && !selected ? "bg-accent-900/50" : ""}`}
              />
              <span className="relative">
                <span className="relative [&::selection]:bg-transparent" title={rendered}>
                  {label}
                </span>
              </span>
            </span>
          )}
        />
        <BaseContextMenuPopup>
          <BaseContextMenuItem
            className="text-destructive-default"
            onClick={() => {
              deleteNode();
              editor.commands.focus();
            }}
          >
            {copy.delete}
          </BaseContextMenuItem>
        </BaseContextMenuPopup>
      </ContextMenu.Root>
    </NodeViewWrapper>
  );
}

export const OfficialComposerMentionNode = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({ "data-id": attributes.id }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({ "data-label": attributes.label }),
      },
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => ({ "data-icon": attributes.icon }),
      },
      providerId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-provider-id"),
        renderHTML: (attributes) => ({ "data-provider-id": attributes.providerId }),
      },
      renderedText: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-rendered-text"),
        renderHTML: (attributes) => ({ "data-rendered-text": attributes.renderedText }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-type='at-mention']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "at-mention" }),
      `@${HTMLAttributes["data-label"] || ""}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.renderedText || node.attrs.label || ""}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(OfficialMentionChipNodeView);
  },
});

function idleMeta(): OfficialComposerMentionState {
  return { ...OFFICIAL_COMPOSER_MENTION_IDLE };
}

export const OfficialComposerMentionExtension = Extension.create<OfficialMentionExtensionOptions>({
  name: "mentionExtension",

  addOptions() {
    return {
      getProviders: () => [],
      onSelect: () => {},
      onStateChange: () => {},
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: officialComposerMentionPluginKey,
        state: {
          init: (): OfficialComposerMentionState => idleMeta(),
          apply: (tr, value) => {
            const meta = tr.getMeta(officialComposerMentionPluginKey) as
              | Partial<OfficialComposerMentionState>
              | undefined;
            if (meta) {
              const next = { ...value, ...meta };
              extension.options.onStateChange(next);
              return next;
            }
            return value;
          },
        },
        view: () => {
          let freezeQuery: string | null = null;
          let generation = 0;
          return {
            update: (view, prevState) => {
              const { state } = view;
              const { $from } = state.selection;
              const before = $from.parent
                .textBetween(Math.max(0, $from.parentOffset - 50), $from.parentOffset, undefined, "￼")
                .match(OFFICIAL_MENTION_TRIGGER);
              if (!before) {
                freezeQuery = null;
                generation += 1;
                const current = officialComposerMentionPluginKey.getState(state) as
                  | OfficialComposerMentionState
                  | undefined;
                if (current?.active || current?.isLoading) {
                  view.dispatch(state.tr.setMeta(officialComposerMentionPluginKey, idleMeta()));
                }
                return;
              }
              const query = before[1] || "";
              const current = officialComposerMentionPluginKey.getState(state) as
                | OfficialComposerMentionState
                | undefined;
              const previous = officialComposerMentionPluginKey.getState(prevState) as
                | OfficialComposerMentionState
                | undefined;
              if (previous?.active && !current?.active) {
                freezeQuery = previous.query;
                generation += 1;
                return;
              }
              if (freezeQuery !== null) {
                if (freezeQuery === "" && query === "") return;
                if (freezeQuery !== "" && query.startsWith(freezeQuery)) return;
                freezeQuery = null;
              }
              if ((current?.active || current?.isLoading) && current.query === query) return;
              const coords = view.coordsAtPos($from.pos);
              const position = { top: coords.bottom + 4, left: coords.left };
              const ticket = ++generation;
              const fetches = extension.options.getProviders().map((provider) => provider.fetchOptions(query));
              const applyOptions = (options: OfficialComposerMentionOption[]) => {
                view.dispatch(
                  view.state.tr.setMeta(officialComposerMentionPluginKey, {
                    active: true,
                    isLoading: false,
                    options,
                    position,
                    query,
                    selectedIndex:
                      current?.active && current.query === query ? current.selectedIndex : 0,
                  }),
                );
              };
              if (fetches.some((item) => Boolean(item) && typeof (item as Promise<unknown>).then === "function")) {
                view.dispatch(
                  state.tr.setMeta(officialComposerMentionPluginKey, {
                    isLoading: true,
                    position,
                    query,
                  }),
                );
                void Promise.all(fetches).then((groups) => {
                  if (ticket === generation) applyOptions(groups.flat());
                });
              } else {
                applyOptions(fetches.flat() as OfficialComposerMentionOption[]);
              }
            },
            destroy: () => {
              generation += 1;
            },
          };
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      ArrowDown: () => {
        const state = officialComposerMentionPluginKey.getState(this.editor.state) as
          | OfficialComposerMentionState
          | undefined;
        if (!state?.active || state.options.length === 0) return false;
        const selectedIndex = Math.min(state.selectedIndex + 1, state.options.length - 1);
        this.editor.view.dispatch(
          this.editor.state.tr.setMeta(officialComposerMentionPluginKey, { selectedIndex }),
        );
        return true;
      },
      ArrowUp: () => {
        const state = officialComposerMentionPluginKey.getState(this.editor.state) as
          | OfficialComposerMentionState
          | undefined;
        if (!state?.active || state.options.length === 0) return false;
        const selectedIndex = Math.max(state.selectedIndex - 1, 0);
        this.editor.view.dispatch(
          this.editor.state.tr.setMeta(officialComposerMentionPluginKey, { selectedIndex }),
        );
        return true;
      },
      Enter: () => {
        const state = officialComposerMentionPluginKey.getState(this.editor.state) as
          | OfficialComposerMentionState
          | undefined;
        if (!state?.active || state.options.length === 0) return false;
        const option = state.options[state.selectedIndex];
        if (option) this.options.onSelect(option.id);
        return true;
      },
      Escape: () => {
        const state = officialComposerMentionPluginKey.getState(this.editor.state) as
          | OfficialComposerMentionState
          | undefined;
        if (!state?.active) return false;
        this.editor.view.dispatch(
          this.editor.state.tr.setMeta(officialComposerMentionPluginKey, idleMeta()),
        );
        return true;
      },
    };
  },
});

export function officialMentionTriggerMatch(textBeforeCursor: string) {
  return textBeforeCursor.match(OFFICIAL_MENTION_TRIGGER);
}
