/**
 * Official Uv (c11959232): Cd.Popup context menu on transcript text/tools items.
 * Items: Copy link?, Copy message ($v rich), Copy as Markdown (plain), Attach, Pin, Rewind, Fork.
 */
import {
  cloneElement,
  useCallback,
  useState,
  type MouseEvent,
  type ReactElement,
} from "react";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  BaseContextMenuSeparator,
  ContextMenu,
} from "../../../shell/BaseMenu";
import {
  copyOfficialMessagePlain,
  copyOfficialMessageRich,
} from "./officialMessageClipboard";

export function OfficialTranscriptItemMenu({
  children,
  isPinned = false,
  onAttachAsContext,
  onFork,
  onPinChapter,
  onRewind,
  text,
}: {
  children: ReactElement;
  isPinned?: boolean;
  onAttachAsContext?: (text: string) => void;
  onFork?: () => void;
  onPinChapter?: () => void;
  onRewind?: () => void;
  text?: string;
}) {
  const hasText = text !== undefined;
  const canAttach = Boolean(onAttachAsContext) && hasText;
  const [selectionIsPartial, setSelectionIsPartial] = useState(false);
  const [linkHref, setLinkHref] = useState<string | null>(null);

  const childOnContextMenu = (children.props as { onContextMenu?: (event: MouseEvent) => void }).onContextMenu;
  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a") as HTMLAnchorElement | null;
      setLinkHref(anchor?.href || null);
      childOnContextMenu?.(event);
    },
    [childOnContextMenu],
  );

  if (!hasText && !onPinChapter && !onFork && !onRewind && !canAttach) return children;

  const copyMessage = () => {
    if (text === undefined) return;
    void copyOfficialMessageRich(text);
  };
  const copyMarkdown = () => {
    if (text === undefined) return;
    void copyOfficialMessagePlain(text);
  };
  const copyLink = () => {
    if (!linkHref) return;
    void copyOfficialMessagePlain(linkHref);
  };
  const attachAsContext = () => {
    if (!onAttachAsContext || text === undefined) return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    const payload = selected.length >= 2 ? selected : text;
    if (payload) onAttachAsContext(payload);
  };

  const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
    onContextMenu: handleContextMenu,
  });

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (!open) {
          setSelectionIsPartial(false);
          setLinkHref(null);
          return;
        }
        const selected = window.getSelection()?.toString().trim() ?? "";
        setSelectionIsPartial(selected.length >= 2);
      }}
    >
      <ContextMenu.Trigger render={trigger as ReactElement<Record<string, unknown>>} />
      <BaseContextMenuPopup>
        {linkHref ? <BaseContextMenuItem onClick={copyLink}>Copy link</BaseContextMenuItem> : null}
        {hasText ? <BaseContextMenuItem onClick={copyMessage}>Copy message</BaseContextMenuItem> : null}
        {hasText ? <BaseContextMenuItem onClick={copyMarkdown}>Copy as Markdown</BaseContextMenuItem> : null}
        {canAttach ? (
          <BaseContextMenuItem onClick={attachAsContext}>
            {selectionIsPartial ? "Attach selection as context" : "Attach message as context"}
          </BaseContextMenuItem>
        ) : null}
        {onPinChapter ? (
          <BaseContextMenuItem onClick={onPinChapter}>{isPinned ? "Unpin chapter" : "Pin as chapter"}</BaseContextMenuItem>
        ) : null}
        {(onRewind || onFork) && (hasText || onPinChapter || canAttach || Boolean(linkHref)) ? <BaseContextMenuSeparator /> : null}
        {onRewind ? <BaseContextMenuItem onClick={onRewind}>Rewind to here</BaseContextMenuItem> : null}
        {onFork ? <BaseContextMenuItem onClick={onFork}>Fork from here</BaseContextMenuItem> : null}
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}
