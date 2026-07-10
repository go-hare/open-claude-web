import { ReactRenderer } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import Suggestion, { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";
import type { Editor } from "@tiptap/core";
import type { ComponentType } from "react";
import type { EditorView } from "prosemirror-view";
import type { CoworkSlashCommandMenuProps, CoworkSlashSuggestionPlacement } from "./CoworkSlashTypes";

export type CoworkSlashCommandSuggestionStorage = {
  cleanup: (() => void) | null;
  disabled: boolean;
  hasVisibleItems: boolean;
  isActive: boolean;
  justClosed: boolean;
};

export const coworkSlashCommandSuggestionPluginKey = new PluginKey("slash-command-suggestion");

type CoworkSlashCommandSuggestionOptions = {
  menuComponent?: ComponentType<CoworkSlashCommandMenuProps>;
  placement?: CoworkSlashSuggestionPlacement;
};

function suggestionStorage(editor: Editor): CoworkSlashCommandSuggestionStorage {
  const editorStorage = editor.storage as unknown as Record<string, unknown>;
  const storage = editorStorage["slash-command-suggestion"] as CoworkSlashCommandSuggestionStorage | undefined;
  if (!storage) {
    const next: CoworkSlashCommandSuggestionStorage = { cleanup: null, disabled: false, hasVisibleItems: false, isActive: false, justClosed: false };
    editorStorage["slash-command-suggestion"] = next;
    return next;
  }
  return storage;
}

function coworkSlashProps(placement: CoworkSlashSuggestionPlacement, props: SuggestionProps): CoworkSlashCommandMenuProps {
  return {
    placement,
    clientRect: props.clientRect ?? null,
    editor: props.editor,
    range: props.range,
    query: props.query,
    onClose: () => exitSuggestion(props.editor.view, coworkSlashCommandSuggestionPluginKey),
  };
}

function createCoworkSlashRenderer(placement: CoworkSlashSuggestionPlacement, editor: Editor, menuComponent: ComponentType<CoworkSlashCommandMenuProps>) {
  let component: ReactRenderer<CoworkSlashCommandMenuProps> | null = null;
  let element: HTMLElement | null = null;
  return {
    onStart: (props: SuggestionProps) => {
      const storage = suggestionStorage(props.editor);
      storage.isActive = true;
      component = new ReactRenderer(menuComponent, { props: coworkSlashProps(placement, props), editor: props.editor });
      element = component.element as HTMLElement;
      element.style.pointerEvents = "auto";
      document.body.appendChild(element);
      storage.cleanup = () => {
        component?.destroy();
        const oldElement = element;
        component = null;
        element = null;
        if (oldElement) requestAnimationFrame(() => oldElement.parentNode?.removeChild(oldElement));
      };
    },
    onUpdate: (props: SuggestionProps) => {
      component?.updateProps(coworkSlashProps(placement, props));
    },
    onKeyDown: ({ event, view }: { event: KeyboardEvent; view: EditorView }) => {
      if (event.key === "Escape") {
        exitSuggestion(view, coworkSlashCommandSuggestionPluginKey);
        return true;
      }
      const storage = suggestionStorage(editor);
      return Boolean(storage.hasVisibleItems && ((event.key !== "Enter" || !event.shiftKey) && (event.key === "Enter" || event.key === "Tab" || event.key === "ArrowUp" || event.key === "ArrowDown")));
    },
    onExit: (props: SuggestionProps) => {
      const storage = suggestionStorage(props.editor);
      storage.isActive = false;
      storage.cleanup = null;
      storage.justClosed = true;
      window.setTimeout(() => {
        storage.justClosed = false;
      }, 100);
      component?.destroy();
      component = null;
      if (element) {
        const oldElement = element;
        element = null;
        requestAnimationFrame(() => oldElement.parentNode?.removeChild(oldElement));
      }
    },
  };
}

export const CoworkSlashCommandSuggestion = Extension.create<CoworkSlashCommandSuggestionOptions, CoworkSlashCommandSuggestionStorage>({
  name: "slash-command-suggestion",

  addOptions() {
    return {
      placement: "onpage",
      menuComponent: undefined,
    };
  },

  addStorage() {
    return {
      isActive: false,
      justClosed: false,
      hasVisibleItems: false,
      cleanup: null,
      disabled: false,
    };
  },

  onDestroy() {
    this.storage.cleanup?.();
    this.storage.cleanup = null;
  },

  addProseMirrorPlugins() {
    const menuComponent = this.options.menuComponent;
    if (!menuComponent) return [];
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: coworkSlashCommandSuggestionPluginKey,
        char: "/",
        allowSpaces: true,
        items: () => [{}],
        command: () => {},
        allow: ({ editor, state, range }) => {
          const storage = suggestionStorage(editor);
          if (storage.disabled) return false;
          if (storage.justClosed) return false;
          const text = state.doc.textBetween(range.from, range.to, "");
          if ((text.startsWith("/") ? text.slice(1) : text).startsWith(" ")) return false;
          const resolved = state.doc.resolve(range.to);
          const parentOffset = resolved.parentOffset;
          if (parentOffset < resolved.parent.content.size) {
            if (resolved.parent.textBetween(parentOffset, parentOffset + 1).trim() !== "") return false;
          }
          return true;
        },
        render: () => createCoworkSlashRenderer(this.options.placement ?? "onpage", this.editor, menuComponent),
      }),
    ];
  },
});
