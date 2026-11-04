/**
 * Official index-BELz Ljt handleMentionSelect.
 * Delete `@query`, insert mention chip + space, then provider.onSelect.
 * Agent provider returns null → delete the chip (Cv pill owns the agent).
 */
import type { Editor } from "@tiptap/core";
import type {
  OfficialComposerMentionOption,
  OfficialComposerMentionProvider,
} from "./officialComposerAgentMentions";
import {
  OFFICIAL_CCD_FILES_PROVIDER_ID,
  officialMentionAtRange,
  officialMentionPathParts,
} from "./officialComposerAgentMentions";
import { officialComposerMentionPluginKey } from "./OfficialComposerMentionExtension";
import { OFFICIAL_COMPOSER_MENTION_IDLE } from "./officialComposerAgentMentions";

export async function applyOfficialComposerMentionSelect(input: {
  editor: Editor | null;
  id: string;
  onDropdownClose: () => void;
  options: OfficialComposerMentionOption[];
  providers: OfficialComposerMentionProvider[];
}): Promise<void> {
  const { editor, id, onDropdownClose, options, providers } = input;
  onDropdownClose();
  const option = options.find((item) => item.id === id);
  if (!option || !editor) return;
  const provider = providers.find((item) => item.id === option.providerId);
  if (!provider) return;
  const { state, view } = editor;
  const { $from } = state.selection;
  const before = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 50),
    $from.parentOffset,
    undefined,
    "￼",
  );
  const range = officialMentionAtRange(before, $from.pos);
  if (!range) return;
  const tr = state.tr;
  tr.delete(range.from, range.to);
  const mentionType = state.schema.nodes.mention;
  const node = mentionType?.create({
    id,
    label: option.label,
    icon: provider.getIconHtml(id),
    providerId: option.providerId,
    renderedText: option.renderedText,
  });
  if (node) {
    tr.insert(range.from, node);
    tr.insertText(" ", range.from + 1);
  }
  view.dispatch(tr);
  const result = await provider.onSelect(id);
  if (!result) {
    editor.view.dispatch(editor.state.tr.delete(range.from, range.from + 2));
    editor.commands.focus();
  }
}

/** Official Qj `je` — File pane attach / pendingFileMention. */
export function officialInsertCcdFileMention(editor: Editor | null, path: string) {
  if (!editor || editor.isDestroyed || !path) return false;
  const label = officialMentionPathParts(path).name || path;
  try {
    editor
      .chain()
      .focus("end")
      .insertContent([
        {
          type: "mention",
          attrs: {
            id: path,
            label,
            providerId: OFFICIAL_CCD_FILES_PROVIDER_ID,
            renderedText: path,
          },
        },
        { type: "text", text: " " },
      ])
      .run();
    return true;
  } catch {
    return false;
  }
}

export function closeOfficialComposerMention(editor: Editor | null) {
  if (!editor || editor.isDestroyed) return;
  editor.view.dispatch(
    editor.state.tr.setMeta(officialComposerMentionPluginKey, { ...OFFICIAL_COMPOSER_MENTION_IDLE }),
  );
}
