import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { GroupNameDialog } from "../../../shell/GroupNameDialog";
import {
  LegacyDropdownItem,
  LegacyDropdownMenu,
  LegacyDropdownPopup,
  LegacyDropdownSeparator,
} from "../../../shell/LegacyDropdown";
import { officialButtonClass } from "../../shared/buttonClasses";
import { OfficialButton } from "../../shared/OfficialButton";
import { selectedSessionIdFromPath, sessionHomePath } from "../../../shell/sessionPaths";
import {
  executeCoworkSessionSkill,
  prefillCoworkSessionComposer,
} from "../composer/coworkSessionComposerActions";
import {
  CoworkArchiveGlyph,
  CoworkChevronDownGlyph,
  CoworkEditGlyph,
  CoworkPinGlyph,
  CoworkScheduledTaskClockGlyph,
  CoworkSkillGlyph,
  CoworkTrashGlyph,
  CoworkUnpinGlyph,
} from "../ui/CoworkOfficialGlyphs";
import {
  archiveCoworkSession,
  deleteCoworkSession,
  replaceAppNavigation,
} from "./coworkSessionDeletion";
import { coworkSessionsBridge } from "./coworkSessionBridge";

/**
 * Official residual index-BELzQL5P.js:
 *   gUt — session title split control (Dc ghost title + Dc ghost icon_sm chevron)
 *   hUt — Ide(align end, unstyledTrigger) + pUt Item/Separator (Cde/wde/kde/Mde)
 *   uUt — RenameSessionModal
 * Local-agent path (f&&g&&x): title click → inline rename input (name-session);
 * menu Rename → uUt modal → onRename.
 * Schedule (v$t Ze): executeSkill(schedule); Turn into skill (Qe): setContent("Turn this task into a skill").
 */

type CoworkSessionHeaderProps = {
  isTitleLoading: boolean;
  onNavigate: (path: string) => void;
  onSessionPatched?: (patch: Partial<SessionSummary>) => void;
  rightAction?: ReactNode;
  session?: SessionSummary | null;
  sessionId: string;
  title: string;
};

export function CoworkSessionHeader({
  isTitleLoading,
  onNavigate,
  onSessionPatched,
  rightAction,
  session,
  sessionId,
  title,
}: CoworkSessionHeaderProps) {
  return (
    <div className="dframe-header absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-3 pl-4 pr-3" data-testid="chat-header">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -bottom-6 z-[-1] bg-gradient-to-b from-bg-100 from-50% via-bg-100/75 via-75% to-bg-100/0" />
      <div className="flex min-w-0 items-center" id="cowork-title-slot">
        <div className="flex min-w-0 md:items-center font-base-bold">
          <div className="flex min-w-0 shrink-1 items-center group -ml-1">
            {isTitleLoading ? (
              <div aria-hidden="true" className="animate-pulse h-5 w-32 rounded-lg bg-bg-300" />
            ) : (
              <CoworkSessionTitleControl
                onNavigate={onNavigate}
                onSessionPatched={onSessionPatched}
                session={session}
                sessionId={sessionId}
                title={title}
              />
            )}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="draggable h-full flex-1 min-w-0" />
      <div className="flex items-center gap-2 shrink-0" id="dframe-header-actions-slot" />
      {rightAction}
    </div>
  );
}

function CoworkSessionTitleControl({
  onNavigate,
  onSessionPatched,
  session,
  sessionId,
  title,
}: {
  onNavigate: (path: string) => void;
  onSessionPatched?: (patch: Partial<SessionSummary>) => void;
  session?: SessionSummary | null;
  sessionId: string;
  title: string;
}) {
  const text = useShellText();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inlineRename, setInlineRename] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(title);
  const [optimisticTitle, setOptimisticTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = optimisticTitle ?? title;
  const rawTitle = session?.title?.trim() || displayTitle;
  const isPinned = Boolean(session?.isPinned);

  useEffect(() => {
    if (!inlineRename) setDraft(rawTitle);
  }, [inlineRename, rawTitle]);

  useEffect(() => {
    if (inlineRename && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inlineRename]);

  const commitRename = useCallback(
    async (next: string) => {
      const name = next.trim();
      if (!name || name === rawTitle) return;
      setOptimisticTitle(name);
      onSessionPatched?.({ title: name });
      try {
        await coworkSessionsBridge.updateSession?.(sessionId, { title: name });
      } catch {
        setOptimisticTitle(null);
      } finally {
        window.setTimeout(() => setOptimisticTitle(null), 500);
      }
    },
    [onSessionPatched, rawTitle, sessionId],
  );

  const finishInline = useCallback(() => {
    void commitRename(draft);
    setInlineRename(false);
  }, [commitRename, draft]);

  const startInlineRename = useCallback(() => {
    setInlineRename(true);
    setDraft(rawTitle);
    setOptimisticTitle(null);
  }, [rawTitle]);

  const onPin = useCallback(() => {
    const next = !isPinned;
    onSessionPatched?.({ isPinned: next });
    void coworkSessionsBridge.updateSession?.(sessionId, { isPinned: next });
  }, [isPinned, onSessionPatched, sessionId]);

  /**
   * Official titlebar archive residual:
   * shared archiveCoworkSession → leave current session (/task/new).
   * Sidebar archive additionally does next/prev; header leaves current session.
   */
  const onArchive = useCallback(async () => {
    const ok = await archiveCoworkSession(sessionId);
    if (!ok) return;
    onSessionPatched?.({ isArchived: true });
    // Primary header: only leave if URL still points at this session.
    // Extra panes close via PaneLayout subscription (stable ref), not primary route.
    if (selectedSessionIdFromPath(window.location.pathname) === sessionId) {
      replaceAppNavigation(sessionHomePath("cowork"));
    }
  }, [onSessionPatched, sessionId]);

  const onDelete = useCallback(async () => {
    const ok = await deleteCoworkSession(sessionId);
    if (!ok) return;
    if (selectedSessionIdFromPath(window.location.pathname) === sessionId) {
      replaceAppNavigation(sessionHomePath("cowork"));
    }
  }, [sessionId]);

  // Official Ze: executeSkill(schedule). Slash residual always injects schedule skill.
  const onSchedule = useCallback(() => {
    executeCoworkSessionSkill(
      sessionId,
      "schedule",
      "schedule",
      "Create a scheduled task that can run automatically.",
    );
  }, [sessionId]);

  // Official Qe: setContent("Turn this task into a skill", [], [])
  const onTurnIntoSkill = useCallback(() => {
    prefillCoworkSessionComposer(sessionId, "Turn this task into a skill");
  }, [sessionId]);

  if (inlineRename) {
    return (
      <div
        role="presentation"
        className="flex items-center bg-bg-000 border border-accent-100 rounded-md h-7 w-48 px-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              finishInline();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setInlineRename(false);
              setDraft(rawTitle);
            }
          }}
          onBlur={finishInline}
          className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent font-base-bold text-text-000 w-full overflow-x-auto"
          style={{ outline: "none", boxShadow: "none" }}
          data-testid="name-session"
          aria-label="Session name"
          autoFocus
        />
      </div>
    );
  }

  const titleEmpty = !displayTitle || displayTitle.length === 0;
  // Official Dc ghost default + residual className on title button.
  const titleClass = [
    titleEmpty ? "!text-text-500" : "!text-text-300 hover:!text-text-100",
    "!shrink !min-w-0 !px-1 !py-0 !scale-100 !h-7 !rounded-r-none",
    "active:!bg-bg-500",
    menuOpen ? "!bg-bg-300" : "",
  ].join(" ");
  // Official Dc ghost icon_sm + residual className on chevron trigger.
  const menuTriggerClass = [
    "!h-7 !w-5 !min-w-0 !rounded-l-none !text-text-300 hover:!text-text-100",
    "active:!bg-bg-500",
    menuOpen ? "!bg-bg-500" : "",
  ].join(" ");

  return (
    <>
      <div className="flex min-w-0 items-center group [&:hover>button]:!bg-bg-300 [&>button:hover]:!bg-bg-500">
        <OfficialButton
          aria-label={`${displayTitle || "Untitled"}, rename session`}
          className={titleClass}
          data-testid="session-title-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            startInlineRename();
          }}
          size="default"
          type="button"
          variant="ghost"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-base-bold">{displayTitle || "Untitled"}</div>
          </div>
        </OfficialButton>
        <div className="w-[1.5px] h-7" />
        {/* Official Ide: align end, unstyledTrigger, sideOffset 4; Content Cde+wde+p-1.5; Item kde/qde */}
        <LegacyDropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <LegacyDropdownMenu.Trigger
            aria-label={displayTitle ? `More options for ${displayTitle}` : "More options"}
            className={officialButtonClass({
              className: menuTriggerClass,
              size: "icon_sm",
              variant: "ghost",
            })}
            data-testid="session-menu-trigger"
            type="button"
          >
            <CoworkChevronDownGlyph size={16} />
          </LegacyDropdownMenu.Trigger>
          <LegacyDropdownPopup align="end" side="bottom" sideOffset={4}>
            {/* Official gUt→hUt: Schedule, Turn into skill, sep, Pin, Rename, sep, Archive, Delete
                Icons: a.jsx(Uy/Vv/Lv/ev/oy/mC,{}) — gc default size 20 */}
            <LegacyDropdownItem
              icon={<CoworkScheduledTaskClockGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                onSchedule();
              }}
            >
              Schedule
            </LegacyDropdownItem>
            <LegacyDropdownItem
              icon={<CoworkSkillGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                onTurnIntoSkill();
              }}
            >
              Turn into skill
            </LegacyDropdownItem>
            <LegacyDropdownSeparator />
            <LegacyDropdownItem
              icon={isPinned ? <CoworkUnpinGlyph size={20} /> : <CoworkPinGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                onPin();
              }}
            >
              {isPinned ? text.unpin : text.pin}
            </LegacyDropdownItem>
            <LegacyDropdownItem
              data-testid="rename-session-trigger"
              icon={<CoworkEditGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                setRenameModalOpen(true);
              }}
            >
              {text.rename}
            </LegacyDropdownItem>
            <LegacyDropdownSeparator />
            <LegacyDropdownItem
              data-testid="archive-session-trigger"
              icon={<CoworkArchiveGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                onArchive();
              }}
            >
              {text.archive}
            </LegacyDropdownItem>
            <LegacyDropdownItem
              danger
              data-testid="delete-session-trigger"
              icon={<CoworkTrashGlyph size={20} />}
              onSelect={() => {
                setMenuOpen(false);
                window.setTimeout(() => setDeleteOpen(true), 100);
              }}
            >
              {text.delete}
            </LegacyDropdownItem>
          </LegacyDropdownPopup>
        </LegacyDropdownMenu.Root>
      </div>

      {/* Official uUt RenameSessionModal residual */}
      <GroupNameDialog
        initialName={rawTitle}
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        onSubmit={(name) => {
          void commitRename(name);
        }}
        placeholder="Session name"
        title="Rename session"
      />

      {/* Official delete confirm residual (jm) */}
      <ConfirmDialog
        confirmText={text.delete}
        isOpen={deleteOpen}
        message="This task will be permanently deleted from your computer and Anthropic's servers, and can't be undone."
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          void onDelete();
        }}
        title="Delete task?"
        variant="danger"
      />
    </>
  );
}
