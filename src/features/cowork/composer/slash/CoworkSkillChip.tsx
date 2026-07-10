import { mergeAttributes, Node, type CommandProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";

function CoworkSkillChipNodeView({ node, selected }: NodeViewProps) {
  const skillId = String(node.attrs.skillId || node.attrs.skillDisplayName || "");
  const displayName = String(node.attrs.skillDisplayName || skillId);
  const description = String(node.attrs.skillDescription || "");
  const subtitle = skillId;
  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <span className={`inline-flex relative cursor-pointer ${selected ? "text-accent-000" : "text-accent-100"}`} title={description || subtitle}>
        <span className={`absolute -inset-y-0.5 -left-0.5 -right-1 rounded-md pointer-events-none ${selected ? "bg-accent-900" : ""}`} />
        <span className="relative pl-2">
          <span className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-5 flex items-center justify-center font-base-bold opacity-50 select-none">/</span>
          <span className="select-none">{displayName}</span>
        </span>
      </span>
    </NodeViewWrapper>
  );
}

export const CoworkSkillChip = Node.create({
  name: "skillChip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      skillId: { default: null },
      skillDisplayName: { default: "" },
      skillDescription: { default: "" },
      skillArgumentHint: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-skill-chip]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.skillId || node.attrs.skillDisplayName || "";
    return ["span", mergeAttributes(HTMLAttributes, { "data-skill-chip": "" }), `/${label}`];
  },

  renderText({ node }) {
    return `/${node.attrs.skillId || node.attrs.skillDisplayName || ""}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(CoworkSkillChipNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => selectPreviousCoworkChip(this.editor, this.name),
    };
  },
});

function selectPreviousCoworkChip(editor: CommandProps["editor"], nodeName: string) {
  const { selection } = editor.state;
  const { $from, empty } = selection;
  if (!empty) return false;
  const nodeBefore = $from.nodeBefore;
  if (nodeBefore && nodeBefore.type.name === nodeName) {
    const pos = $from.pos - nodeBefore.nodeSize;
    return editor.chain().setNodeSelection(pos).run();
  }
  return false;
}
