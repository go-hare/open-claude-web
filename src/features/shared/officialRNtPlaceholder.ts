/**
 * Official residual index-BELzQL5P.js `INt` / `RNt` Placeholder — 1:1 plugin shape.
 *
 * Official:
 *   INt=ugt.create({name:"placeholder",addOptions:()=>({
 *     emptyEditorClass:"is-editor-empty",
 *     emptyNodeClass:"is-empty",
 *     placeholder:"Write something …",
 *     showOnlyWhenEditable:!0,
 *     showOnlyCurrent:!0,
 *     includeChildren:!1
 *   }), addProseMirrorPlugins(){ return [new Plugin({ decorations })] }})
 *   RNt=INt
 *   vTt: RNt.configure({ placeholder: x.current,
 *     emptyEditorClass:"is-editor-empty before:!text-text-500 before:whitespace-nowrap" })
 *
 * Why not @tiptap/extensions/placeholder@3.27:
 *   TipTap 3.27 ships viewport overscan + meta transactions absent from residual INt.
 *
 * No host invent: no composing skip, no viewport plugin — decorations only.
 * PM names: Decoration / DecorationSet (not Decorations / DecorationsSet).
 */

import { Extension, isNodeEmpty, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type OfficialRNtPlaceholderOptions = {
  emptyEditorClass: string;
  emptyNodeClass: string;
  placeholder:
    | string
    | ((props: {
        editor: Editor;
        node: ProseMirrorNode;
        pos: number;
        hasAnchor: boolean;
      }) => string);
  showOnlyWhenEditable: boolean;
  showOnlyCurrent: boolean;
  includeChildren: boolean;
};

const RNT_PLACEHOLDER_KEY = new PluginKey("placeholder");

export const OfficialRNtPlaceholder = Extension.create<OfficialRNtPlaceholderOptions>({
  name: "placeholder",

  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      placeholder: "Write something …",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: RNT_PLACEHOLDER_KEY,
        props: {
          decorations: ({ doc, selection }) => {
            const editor = extension.editor;
            const active = editor.isEditable || !extension.options.showOnlyWhenEditable;
            if (!active) return null;

            const { anchor } = selection;
            const decorations: Array<ReturnType<typeof Decoration.node>> = [];
            const isEmptyDoc = editor.isEmpty;

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && isNodeEmpty(node);
              if ((hasAnchor || !extension.options.showOnlyCurrent) && isEmpty) {
                const classes = [extension.options.emptyNodeClass];
                if (isEmptyDoc) classes.push(extension.options.emptyEditorClass);
                const placeholder =
                  typeof extension.options.placeholder === "function"
                    ? extension.options.placeholder({
                        editor,
                        node,
                        pos,
                        hasAnchor,
                      })
                    : extension.options.placeholder;
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: classes.join(" "),
                    "data-placeholder": placeholder,
                  }),
                );
              }
              return extension.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
