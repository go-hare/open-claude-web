/**
 * Official residual qa settings panel (ce28369f9):
 * Ka instructions + Qa scheduled (when enabled) + Ga Context (Va/Ya/Ba).
 * Memory chip + source count chips from Pa residual.
 */
import { Menu } from "@base-ui-components/react/menu";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  desktopBridge,
  type CoworkSpaceLink,
  type ScheduledTaskSummary,
  type SpaceFolderEntry,
} from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { ScheduledTaskCreateModal } from "../cowork/scheduled/ScheduledTaskCreateModal";
import { labelFromCron, taskDisplayName } from "../cowork/scheduled/scheduleUtils";
import { officialButtonClass } from "../shared/buttonClasses";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialModal } from "../shared/OfficialModal";
import { useDesktopPreferences } from "../settings/useDesktopPreferences";
import {
  formatSourceCount,
  formatSpaceDetailTemplate,
  type SpaceDetailText,
} from "./spaceDetailMessages";

/**
 * Residual ce283 Qa/Ga header action: me({ trigger: T ghost icon_sm + Plus h size 16,
 * unstyledTrigger, align end }). Both scheduled and context use the same Plus trigger chrome.
 */
function SpaceSettingsPlusMenu({
  ariaLabel,
  children,
  menuClassName = "min-w-[200px] max-w-2xl",
  onOpenChange,
  open,
}: {
  ariaLabel: string;
  children: ReactNode;
  menuClassName?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Menu.Root onOpenChange={onOpenChange} open={open}>
      <Menu.Trigger
        aria-label={ariaLabel}
        className={officialButtonClass({ size: "icon_sm", variant: "ghost" })}
        data-official-source="ce28369f9-C9QQvDN-.js:me trigger T+h"
        type="button"
      >
        <Icon customSize={16} name="Add" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" className="z-20" sideOffset={4}>
          <Menu.Popup
            className={[
              "overflow-hidden rounded-xl border border-border-300 bg-bg-000 py-1 shadow-lg outline-none",
              menuClassName,
            ].join(" ")}
            data-official-source="ce28369f9-C9QQvDN-.js:me Ade"
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Residual he menu row used inside me. */
function SpaceSettingsMenuItem({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <Menu.Item
      className="flex w-full cursor-default items-center gap-2 px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-bg-100"
      onClick={onClick}
    >
      {icon ? <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Menu.Item>
  );
}

export function SpaceDetailSettingsPanel({
  folders,
  instructions,
  links = [],
  onFoldersChange,
  onInstructionsChange,
  onLinksChange,
  onNavigate,
  spaceId,
  text,
}: {
  folders: string[];
  instructions: string;
  links?: CoworkSpaceLink[];
  onFoldersChange: (folders: string[]) => void;
  onInstructionsChange: (instructions: string) => void;
  onLinksChange?: (links: CoworkSpaceLink[]) => void;
  onNavigate?: (path: string) => void;
  spaceId: string;
  text: SpaceDetailText;
}) {
  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto px-4 pb-4 pt-8"
      data-official-source="ce28369f9-C9QQvDN-.js:qa"
    >
      <SpaceInstructionsSection
        instructions={instructions}
        onInstructionsChange={onInstructionsChange}
        spaceId={spaceId}
        text={text}
      />
      {/* Residual qa: o&&Qa — product always has scheduled bridge; show Qa. */}
      <SpaceScheduledSection folders={folders} onNavigate={onNavigate} spaceId={spaceId} text={text} />
      <SpaceContextSection
        folders={folders}
        links={links}
        onFoldersChange={onFoldersChange}
        onLinksChange={onLinksChange}
        spaceId={spaceId}
        text={text}
      />
    </div>
  );
}

function SpaceSectionCard({
  action,
  children,
  collapsedSummary,
  forceExpanded,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  collapsedSummary?: ReactNode;
  forceExpanded?: boolean;
  label: ReactNode;
}) {
  // Residual sn: expanded default true; forceExpanded locks open; body/summary via tn grid rows.
  const [expanded, setExpanded] = useState(true);
  const open = expanded || !!forceExpanded;
  const toggle = () => setExpanded((value) => !value);
  return (
    <div
      className="rounded-xl border-0.5 border-border-300 bg-bg-100 px-6 shadow-sm"
      data-official-source="ce28369f9-C9QQvDN-.js:sn"
    >
      <div className="flex min-h-14 items-center gap-1">
        <button
          aria-expanded={open}
          className="min-w-0 flex-1 self-stretch text-left text-sm text-text-500"
          onClick={toggle}
          type="button"
        >
          {label}
        </button>
        {action}
        <button
          aria-expanded={open}
          className="-mr-1 p-1 text-text-500 transition-colors hover:text-text-300"
          onClick={toggle}
          type="button"
        >
          <Icon customSize={16} name={open ? "CaretDown" : "CaretRight"} />
        </button>
      </div>
      <SpaceSectionCollapse open={open}>{children}</SpaceSectionCollapse>
      {collapsedSummary ? (
        <SpaceSectionCollapse open={!open}>{collapsedSummary}</SpaceSectionCollapse>
      ) : null}
    </div>
  );
}

/** Residual tn: grid-template-rows collapse for sn body / collapsedSummary. */
function SpaceSectionCollapse({ children, open }: { children: ReactNode; open: boolean }) {
  return (
    <div
      className="-mx-1 grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
      data-official-source="ce28369f9-C9QQvDN-.js:tn"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="min-h-0 min-w-0">
        <div className="px-1 pb-4">{children}</div>
      </div>
    </div>
  );
}

function SpaceInstructionsSection({
  instructions,
  onInstructionsChange,
  spaceId,
  text,
}: {
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
  spaceId: string;
  text: SpaceDetailText;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(instructions);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);
  const hasInstructions = !!instructions.trim();

  useLayoutEffect(() => {
    setExpanded(false);
  }, [instructions]);

  useLayoutEffect(() => {
    const node = bodyRef.current;
    if (node) setOverflows(node.scrollHeight > node.clientHeight + 1);
  }, [instructions, expanded]);

  const openEdit = () => {
    setDraft(instructions);
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const next = draft.trim();
      const updated = await desktopBridge.CoworkSpaces.update?.(spaceId, {
        instructions: next || null,
      });
      onInstructionsChange(updated?.instructions ?? next);
      setEditing(false);
    } catch {
      // residual toast: Failed to save instructions…
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SpaceSectionCard
        action={
          <OfficialButton
            aria-label={text.editInstructions}
            onClick={openEdit}
            size="icon_sm"
            type="button"
            variant="ghost"
          >
            <Icon customSize={16} name="Edit" />
          </OfficialButton>
        }
        label={text.instructions}
      >
        {hasInstructions ? (
          <div>
            <div className="relative">
              <p
                className={
                  expanded
                    ? "whitespace-pre-wrap break-words text-sm text-text-200"
                    : "max-h-40 overflow-hidden whitespace-pre-wrap break-words text-sm text-text-200"
                }
                ref={bodyRef}
              >
                {instructions}
              </p>
              {!expanded && overflows ? (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-100 to-transparent" />
              ) : null}
            </div>
            {overflows || expanded ? (
              <button
                aria-expanded={expanded}
                className="mt-2 text-xs text-text-500 hover:text-text-300"
                onClick={() => setExpanded((value) => !value)}
                type="button"
              >
                {expanded ? text.showLess : text.showMore}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm italic text-text-500">{text.instructionsEmpty}</p>
        )}
      </SpaceSectionCard>

      <OfficialModal isOpen={editing} modalSize="lg" onClose={() => !saving && setEditing(false)} title={text.editInstructions}>
        <div className="flex flex-col gap-4 pt-2">
          <textarea
            autoFocus
            className="can-focus min-h-[180px] w-full rounded-[0.6rem] border border-border-300 bg-bg-000 px-3 py-2 text-sm leading-5 text-text-100 transition-colors placeholder:text-text-500 hover:border-border-200"
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={text.instructionsPlaceholder}
            rows={8}
            value={draft}
          />
          <div className="flex justify-end gap-2">
            <OfficialButton disabled={saving} onClick={() => setEditing(false)} type="button" variant="secondary">
              {text.cancel}
            </OfficialButton>
            <OfficialButton disabled={saving} loading={saving} onClick={() => void save()} type="button" variant="primary">
              {saving ? text.saving : text.save}
            </OfficialButton>
          </div>
        </div>
      </OfficialModal>
    </>
  );
}

function SpaceContextSection({
  folders,
  links,
  onFoldersChange,
  onLinksChange,
  spaceId,
  text,
}: {
  folders: string[];
  links: CoworkSpaceLink[];
  onFoldersChange: (folders: string[]) => void;
  onLinksChange?: (links: CoworkSpaceLink[]) => void;
  spaceId: string;
  text: SpaceDetailText;
}) {
  const [preferences] = useDesktopPreferences();
  const memoryOn = preferences?.enabledCoworkMemory !== false;
  const [addingLink, setAddingLink] = useState(false);
  // Residual Ga: me open state on the single Plus trigger (not a separate Link header button).
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  // Residual sourceCount: folders + projects + links
  const sourceCount = folders.length + links.length;
  const empty = folders.length === 0 && links.length === 0;

  const addFolder = useCallback(async () => {
    setAddMenuOpen(false);
    const picked =
      (await desktopBridge.FileSystem.browseFolder?.(text.selectFolders).catch(() => null)) ??
      (await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null))?.[0] ??
      null;
    if (!picked) return;
    if (folders.includes(picked)) return;
    try {
      await desktopBridge.CoworkSpaces.addFolderToSpace?.(spaceId, picked);
      onFoldersChange([...folders, picked]);
    } catch {
      // residual toast
    }
  }, [folders, onFoldersChange, spaceId, text.selectFolders]);

  const removeFolder = useCallback(
    async (folderPath: string) => {
      try {
        await desktopBridge.CoworkSpaces.removeFolderFromSpace?.(spaceId, folderPath);
        onFoldersChange(folders.filter((path) => path !== folderPath));
      } catch {
        // residual toast
      }
    },
    [folders, onFoldersChange, spaceId],
  );

  const addLink = useCallback(
    async (url: string) => {
      const link: CoworkSpaceLink = { url };
      try {
        await desktopBridge.CoworkSpaces.addLinkToSpace?.(spaceId, link);
        onLinksChange?.([...links, link]);
      } catch {
        // residual toast
      }
    },
    [links, onLinksChange, spaceId],
  );

  const removeLink = useCallback(
    async (url: string) => {
      try {
        await desktopBridge.CoworkSpaces.removeLinkFromSpace?.(spaceId, url);
        onLinksChange?.(links.filter((link) => link.url !== url));
      } catch {
        // residual toast
      }
    },
    [links, onLinksChange, spaceId],
  );

  const chips = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2" data-official-source="ce28369f9-C9QQvDN-.js:Pa">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border-0.5 border-border-300 bg-bg-100 px-2.5 py-1 text-xs",
            sourceCount === 0 ? "text-text-500" : "text-text-300",
          ].join(" ")}
        >
          <Icon className="flex-shrink-0" customSize={14} name="Folder" />
          {formatSourceCount(text, sourceCount)}
        </span>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full border-0.5 border-border-300 bg-bg-100 px-2.5 py-1 text-xs",
            memoryOn ? "text-text-300" : "text-text-500",
          ].join(" ")}
        >
          <Icon className="flex-shrink-0" customSize={14} name="Memory" />
          {memoryOn ? text.memoryOn : text.memoryOff}
        </span>
      </div>
    ),
    [memoryOn, sourceCount, text],
  );

  // Residual Ga action B: me(trigger T ghost icon_sm + h Plus size 16) — folder + "Add a link" in menu only.
  const contextAddAction = (
    <SpaceSettingsPlusMenu
      ariaLabel={text.addContext}
      menuClassName="min-w-[200px] max-w-2xl"
      onOpenChange={setAddMenuOpen}
      open={addMenuOpen}
    >
      <SpaceSettingsMenuItem icon={<Icon customSize={16} name="Folder" />} onClick={() => void addFolder()}>
        {text.chooseFolder}
      </SpaceSettingsMenuItem>
      <SpaceSettingsMenuItem
        icon={<Icon customSize={16} name="Link" />}
        onClick={() => {
          setAddMenuOpen(false);
          setAddingLink(true);
        }}
      >
        {text.addLink}
      </SpaceSettingsMenuItem>
    </SpaceSettingsPlusMenu>
  );

  return (
    <SpaceSectionCard
      action={contextAddAction}
      // Residual Ga: forceExpanded when no folders/projects/links; Pa chips only as collapsedSummary.
      collapsedSummary={chips}
      forceExpanded={empty}
      label={text.context}
    >
      <div className="flex flex-col gap-4">
        {folders.length > 0 ? (
          <section data-official-source="ce28369f9-C9QQvDN-.js:Va">
            <h3 className="mb-2 text-sm font-medium text-text-300">{text.onYourComputer}</h3>
            <ul className="flex flex-col gap-1">
              {folders.map((folderPath, index) => {
                const name = folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
                // Residual Va: first folder cannot be removed (onRemove: 0===t ? void 0 : …).
                const canRemove = index > 0;
                return (
                  <li
                    className="group flex items-center gap-2 rounded-lg bg-bg-200 px-2 py-1.5"
                    key={folderPath}
                  >
                    <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Folder" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-text-300" title={folderPath}>
                        {name}
                      </div>
                    </div>
                    {canRemove ? (
                      <OfficialButton
                        aria-label={formatSpaceDetailTemplate(text.removeFolder, { name })}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => void removeFolder(folderPath)}
                        size="icon_sm"
                        type="button"
                        variant="ghost"
                      >
                        <Icon customSize={14} name="X" />
                      </OfficialButton>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {/* Residual Ga always renders Ya after Va (even when empty). */}
        <SpaceMemorySection spaceId={spaceId} text={text} />
        {links.length > 0 || addingLink ? (
          <SpaceLinksSection
            isAdding={addingLink}
            links={links}
            onAdd={(url) => {
              void addLink(url);
              setAddingLink(false);
            }}
            onCancel={() => setAddingLink(false)}
            onRemove={(url) => void removeLink(url)}
            text={text}
          />
        ) : null}
        {empty && !addingLink ? <p className="text-sm italic text-text-500">{text.noContext}</p> : null}
      </div>
    </SpaceSectionCard>
  );
}

/** Residual Qa: scheduled tasks card between Ka and Ga. */
function SpaceScheduledSection({
  folders: spaceFolderPaths,
  onNavigate,
  spaceId,
  text,
}: {
  folders: string[];
  onNavigate?: (path: string) => void;
  spaceId: string;
  text: SpaceDetailText;
}) {
  const [tasks, setTasks] = useState<ScheduledTaskSummary[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = useCallback(async () => {
    // Residual space Qa: only CoworkScheduledTasks (jT), never CCD/Code routines.
    const items = (await desktopBridge.CoworkScheduledTasks.list().catch(() => [])) ?? [];
    setTasks(items);
  }, []);

  useEffect(() => {
    void reload();
    const unsub = desktopBridge.CoworkScheduledTasks.onEvent?.(() => {
      void reload();
    });
    return () => unsub?.();
  }, [reload]);

  const linked = useMemo(() => tasks.filter((task) => task.spaceId === spaceId), [spaceId, tasks]);
  const unlinked = useMemo(() => tasks.filter((task) => !task.spaceId), [tasks]);
  const existingNames = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);

  const linkTask = useCallback(
    async (task: ScheduledTaskSummary) => {
      setMenuOpen(false);
      try {
        await desktopBridge.CoworkScheduledTasks.update?.(task.id, { spaceId });
        await reload();
      } catch {
        // residual toast
      }
    },
    [reload, spaceId],
  );

  const unlinkTask = useCallback(
    async (taskId: string) => {
      try {
        await desktopBridge.CoworkScheduledTasks.update?.(taskId, { spaceId: "" });
        await reload();
      } catch {
        // residual toast
      }
    },
    [reload],
  );

  // Residual Qa action v: same Plus trigger (T+h) as Ga; me only when unlinked tasks exist.
  const addAction =
    unlinked.length > 0 ? (
      <SpaceSettingsPlusMenu
        ariaLabel={text.addScheduledTask}
        menuClassName="max-h-72 min-w-[280px] max-w-2xl overflow-y-auto"
        onOpenChange={setMenuOpen}
        open={menuOpen}
      >
        <div className="px-2 pb-0.5 pt-1">
          <span className="text-xs font-medium text-text-500">{text.existingTasks}</span>
        </div>
        {unlinked.map((task) => (
          <Menu.Item
            className="flex w-full cursor-default flex-col px-3 py-2 text-left outline-none data-[highlighted]:bg-bg-100"
            key={task.id}
            onClick={() => void linkTask(task)}
          >
            <span className="truncate text-sm">{taskDisplayName(task)}</span>
            {task.description ? (
              <span className="truncate text-xs text-text-500">{task.description}</span>
            ) : null}
          </Menu.Item>
        ))}
        <div className="my-1 border-t border-border-300" />
        <SpaceSettingsMenuItem
          icon={<Icon customSize={16} name="Add" />}
          onClick={() => {
            setMenuOpen(false);
            setCreateOpen(true);
          }}
        >
          {text.createNewTask}
        </SpaceSettingsMenuItem>
      </SpaceSettingsPlusMenu>
    ) : (
      <OfficialButton
        aria-label={text.addScheduledTask}
        onClick={() => setCreateOpen(true)}
        size="icon_sm"
        type="button"
        variant="ghost"
      >
        <Icon customSize={16} name="Add" />
      </OfficialButton>
    );

  return (
    <div data-official-source="ce28369f9-C9QQvDN-.js:Qa">
      <SpaceSectionCard action={addAction} label={text.scheduledTasks}>
        {linked.length === 0 ? (
          <p className="text-sm italic text-text-500">{text.scheduledEmpty}</p>
        ) : (
          <div className="flex flex-col gap-1" data-official-source="ce28369f9-C9QQvDN-.js:Qa list">
            {linked.map((task) => {
              const name = taskDisplayName(task);
              const schedule = labelFromCron(task.cronExpression);
              // Residual en: folders on task not in spaceFolderPaths → "Has access to N folders not in this project".
              const spaceSet = new Set(spaceFolderPaths);
              const extraFolders = (task.userSelectedFolders ?? (task.cwd ? [task.cwd] : [])).filter(
                (path) => path && !spaceSet.has(path),
              );
              return (
                <div className="rounded-lg bg-bg-200" key={task.id}>
                  <div className="group flex items-start gap-2 px-3 py-2">
                    <button
                      className="flex min-w-0 flex-1 flex-col gap-0.5 text-left transition-colors hover:text-text-100"
                      onClick={() => onNavigate?.(`/scheduled-task/${encodeURIComponent(task.id)}`)}
                      type="button"
                    >
                      <span className="truncate text-sm font-medium text-text-200">{name}</span>
                      <span className="truncate text-xs text-text-500">{schedule}</span>
                    </button>
                    <div className="relative flex flex-shrink-0 items-center">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-md border-0.5 px-1.5 py-0.5 text-xs font-medium transition-transform group-hover:-translate-x-6",
                          task.enabled
                            ? "border-success-000/40 bg-success-900 text-success-000"
                            : "border-border-300 bg-bg-200 text-text-400",
                        ].join(" ")}
                      >
                        {task.enabled ? text.scheduledActive : text.scheduledPaused}
                      </span>
                      <button
                        aria-label={formatSpaceDetailTemplate(text.unlinkTask, { name })}
                        className="absolute right-0 p-0.5 text-text-500 opacity-0 transition-opacity hover:text-text-200 group-hover:opacity-100"
                        onClick={() => void unlinkTask(task.id)}
                        type="button"
                      >
                        <Icon customSize={14} name="X" />
                      </button>
                    </div>
                  </div>
                  {extraFolders.length > 0 ? (
                    <div
                      className="flex items-center gap-1 px-3 pb-2"
                      data-official-source="ce28369f9-C9QQvDN-.js:en extra folders"
                      title={extraFolders.join("\n")}
                    >
                      <span className="text-xs text-text-500">
                        {extraFolders.length === 1
                          ? "Has access to 1 folder not in this project"
                          : `Has access to ${extraFolders.length} folders not in this project`}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SpaceSectionCard>
      <ScheduledTaskCreateModal
        existingNames={existingNames}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void reload();
        }}
        spaceFolderPaths={spaceFolderPaths}
        spaceId={spaceId}
      />
    </div>
  );
}

/** Residual Ba: Links section under Context. */
function SpaceLinksSection({
  isAdding,
  links,
  onAdd,
  onCancel,
  onRemove,
  text,
}: {
  isAdding: boolean;
  links: CoworkSpaceLink[];
  onAdd: (url: string) => void;
  onCancel: () => void;
  onRemove: (url: string) => void;
  text: SpaceDetailText;
}) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurArmed = useRef(false);

  useEffect(() => {
    if (!isAdding) return;
    blurArmed.current = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    const timer = window.setTimeout(() => {
      blurArmed.current = true;
    }, 150);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [isAdding]);

  const commit = useCallback(() => {
    const raw = draft.trim();
    if (!raw) {
      setDraft("");
      onCancel();
      return;
    }
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const host = new URL(withScheme).hostname;
      if (!host.includes(".")) {
        setInvalid(true);
        return;
      }
      blurArmed.current = false;
      setDraft("");
      onAdd(withScheme);
      onCancel();
    } catch {
      setInvalid(true);
    }
  }, [draft, onAdd, onCancel]);

  return (
    <section data-official-source="ce28369f9-C9QQvDN-.js:Ba">
      <h3 className="mb-2 text-sm font-medium text-text-300">{text.links}</h3>
      {links.length > 0 ? (
        <div className="mb-2 flex flex-col gap-1">
          {links.map((link) => {
            let host = link.title ?? link.url;
            try {
              host = link.title ?? new URL(link.url).hostname;
            } catch {
              // keep raw
            }
            return (
              <div
                className="group flex items-center gap-2 rounded-lg bg-bg-200 px-3 py-1.5 text-sm text-text-300"
                key={link.url}
              >
                <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Link" />
                <a
                  className="min-w-0 flex-1 truncate hover:text-text-100"
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                  title={link.url}
                >
                  {host}
                </a>
                <button
                  aria-label={formatSpaceDetailTemplate(text.removeLink, { url: link.url })}
                  className="text-text-500 opacity-0 transition-opacity hover:text-text-200 group-hover:opacity-100"
                  onClick={() => onRemove(link.url)}
                  type="button"
                >
                  <Icon customSize={14} name="X" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            aria-invalid={invalid}
            aria-label="URL"
            className={
              invalid
                ? "min-w-0 flex-1 rounded-lg border border-danger-200 bg-bg-000 px-3 py-1.5 text-sm text-text-200 outline-none transition-colors placeholder:text-text-500 focus:border-danger-200"
                : "min-w-0 flex-1 rounded-lg border border-border-300 bg-bg-000 px-3 py-1.5 text-sm text-text-200 outline-none transition-colors placeholder:text-text-500 focus:border-border-200"
            }
            onBlur={() => {
              if (blurArmed.current) commit();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                setDraft("");
                setInvalid(false);
                onCancel();
              }
            }}
            placeholder={text.pasteUrl}
            ref={inputRef}
            type="url"
            value={draft}
          />
        </div>
      ) : null}
    </section>
  );
}

/**
 * Official residual Ya (ce283): Memory section under Context.
 * Aa: getAutoMemoryDir → supported; hs: enabledCoworkMemory preference.
 */
function SpaceMemorySection({ spaceId, text }: { spaceId: string; text: SpaceDetailText }) {
  const [preferences] = useDesktopPreferences();
  const memoryEnabled = preferences?.enabledCoworkMemory !== false;
  const [autoMemoryDir, setAutoMemoryDir] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<SpaceFolderEntry[] | null>(null);
  const [listing, setListing] = useState(false);

  useEffect(() => {
    let alive = true;
    // Residual Aa: if Fe.getAutoMemoryDir missing → isSupported false; if present → true even on null/error.
    const api = desktopBridge.CoworkSpaces.getAutoMemoryDir;
    if (!api) {
      setAutoMemoryDir(null);
      setIsSupported(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void (async () => {
      try {
        const dir = await api(spaceId);
        if (!alive) return;
        setAutoMemoryDir(typeof dir === "string" && dir.length > 0 ? dir : null);
        setIsSupported(true);
      } catch {
        if (!alive) return;
        setAutoMemoryDir(null);
        setIsSupported(true);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [spaceId]);

  const loadChildren = useCallback(
    async (folderPath: string) => {
      try {
        return (await desktopBridge.CoworkSpaces.listFolderContents?.(spaceId, folderPath)) ?? [];
      } catch {
        return [];
      }
    },
    [spaceId],
  );

  const toggle = useCallback(() => {
    if (!autoMemoryDir) return;
    const next = !expanded;
    setExpanded(next);
    if (next && entries === null) {
      setListing(true);
      void loadChildren(autoMemoryDir)
        .then((items) => setEntries(items))
        .finally(() => setListing(false));
    }
  }, [autoMemoryDir, entries, expanded, loadChildren]);

  if (!isLoading && !isSupported) {
    return (
      <section data-official-source="ce28369f9-C9QQvDN-.js:Ya unsupported">
        <h3 className="mb-2 text-sm font-medium text-text-300">{text.memory}</h3>
        <p className="text-sm italic text-text-500">{text.memoryUpdateDesktop}</p>
      </section>
    );
  }

  const expandLabel = formatSpaceDetailTemplate(expanded ? text.collapseName : text.expandName, {
    name: text.memory,
  });

  return (
    <section data-official-source="ce28369f9-C9QQvDN-.js:Ya">
      <h3 className="mb-2 text-sm font-medium text-text-300">{text.memory}</h3>
      {!memoryEnabled ? (
        <p className="mb-2 text-sm italic text-text-500">{text.memoryOffHint}</p>
      ) : null}
      <div className="rounded-lg bg-bg-200 p-1">
        <button
          aria-expanded={expanded}
          aria-label={expandLabel}
          className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-text-300 transition-colors hover:text-text-100"
          disabled={!autoMemoryDir}
          onClick={toggle}
          type="button"
        >
          <span className="flex-shrink-0 text-text-400">
            <Icon customSize={12} name={expanded ? "CaretDown" : "CaretRight"} />
          </span>
          <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Memory" />
          <span className="min-w-0 flex-1 truncate">{text.memory}</span>
        </button>
        {expanded ? (
          <div className="ml-6 max-h-64 overflow-y-auto border-l border-dotted border-border-400">
            {listing ? <div className="px-2 py-1 text-xs text-text-500">...</div> : null}
            {entries && entries.length > 0 ? (
              <ul className="flex flex-col">
                {entries.map((entry) => (
                  <li className="truncate px-2 py-1 text-xs text-text-300" key={entry.path} title={entry.path}>
                    {entry.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {entries && entries.length === 0 && !listing ? (
              <p className="px-2 py-1.5 text-xs italic text-text-500">
                {memoryEnabled ? text.memoryAskClaude : text.memoryNoFiles}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
