import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalFileEntry } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { OfficialButton, OfficialModal } from "../OfficialEpitaxyComponents";
import type { CoworkOpenFileTarget } from "./coworkActivityTypes";
import { basename } from "./coworkResourcePaths";

type CoworkFileExplorerModalProps = {
  folders: string[];
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (target: CoworkOpenFileTarget) => void;
  sessionId: string;
};

export function CoworkFileExplorerModal({ folders, isOpen, onClose, onOpenFile, sessionId }: CoworkFileExplorerModalProps) {
  const [selectedFolderIndex, setSelectedFolderIndex] = useState(0);
  const [entriesByFolder, setEntriesByFolder] = useState<Record<string, LocalFileEntry[] | null>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const activeFolder = folders[selectedFolderIndex] ?? folders[0];
  const entries = activeFolder ? entriesByFolder[activeFolder] ?? null : null;

  const loadFolder = useCallback(async (folder: string) => {
    if (!desktopBridge.FileSystem.listFilesInFolder) return;
    setIsLoading(true);
    try {
      const nextEntries = await desktopBridge.FileSystem.listFilesInFolder(sessionId, folder);
      setEntriesByFolder((current) => ({ ...current, [folder]: nextEntries }));
      return nextEntries;
    } catch {
      setEntriesByFolder((current) => ({ ...current, [folder]: [] }));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFolderIndex(0);
    setSelectedPath(null);
    setEntriesByFolder({});
    setRefreshKey((value) => value + 1);
  }, [isOpen, folders]);

  useEffect(() => {
    if (!isOpen || !activeFolder || entriesByFolder[activeFolder] !== undefined) return;
    void loadFolder(activeFolder);
  }, [activeFolder, entriesByFolder, isOpen, loadFolder]);

  if (!isOpen || folders.length === 0) return null;

  return (
    <OfficialModal isOpen={isOpen} onClose={onClose} title="Browse files" width="w-[960px]">
      <div className="flex h-[70vh] min-h-[24rem] flex-col gap-2">
        {folders.length > 1 ? <CoworkFolderTabs activeIndex={selectedFolderIndex} folders={folders} onSelect={setSelectedFolderIndex} /> : null}
        <div className="flex min-h-0 flex-1 gap-3">
          <section className="flex w-72 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border-300 bg-bg-100">
            <CoworkFileExplorerFolderHeader folder={activeFolder} isLoading={isLoading} onRefresh={() => activeFolder && void loadFolder(activeFolder)} />
            <div className="flex-1 overflow-y-auto py-1">
              {isLoading && entries === null ? <CoworkFileExplorerStatus label="Loading" /> : null}
              {entries !== null && entries.length === 0 ? <CoworkFileExplorerEmpty /> : null}
              {entries && entries.length > 0 ? (
                <CoworkFileTree
                  entries={entries}
                  onLoadChildren={loadFolder}
                  onSelectFile={setSelectedPath}
                  selectedPath={selectedPath}
                  treeKey={`${activeFolder}:${refreshKey}`}
                />
              ) : null}
            </div>
          </section>
          <CoworkFilePreviewPane onOpenFile={onOpenFile} selectedPath={selectedPath} />
        </div>
      </div>
    </OfficialModal>
  );
}

function CoworkFolderTabs({ activeIndex, folders, onSelect }: { activeIndex: number; folders: string[]; onSelect: (index: number) => void }) {
  return (
    <div className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-border-300 pb-2">
      {folders.map((folder, index) => {
        const selected = index === activeIndex;
        return (
          <button
            aria-pressed={selected}
            className={`max-w-48 truncate rounded-lg px-3 py-1.5 text-sm transition-colors ${selected ? "bg-bg-300 font-medium text-text-100" : "text-text-300 hover:bg-bg-200 hover:text-text-100"}`}
            key={folder}
            onClick={() => onSelect(index)}
            title={folder}
            type="button"
          >
            {basename(folder) ?? folder}
          </button>
        );
      })}
    </div>
  );
}

function CoworkFileExplorerFolderHeader({ folder, isLoading, onRefresh }: { folder?: string; isLoading: boolean; onRefresh: () => void }) {
  const openFolder = () => {
    if (folder) void desktopBridge.FileSystem.showInFolder?.(folder);
  };
  return (
    <div className="flex items-center gap-2 border-b border-border-300 px-2 py-1.5">
      <Icon className="flex-shrink-0 text-text-400" name="Folder1" size="xs" />
      <span className="flex-1 truncate text-xs text-text-300" title={folder}>{folder ? basename(folder) ?? folder : ""}</span>
      <CoworkFileExplorerIconButton ariaLabel="Refresh" disabled={isLoading} icon="Reload" onClick={onRefresh} />
      <CoworkFileExplorerIconButton ariaLabel="Open folder" icon="Folder" onClick={openFolder} />
    </div>
  );
}

function CoworkFileTree({ entries, onLoadChildren, onSelectFile, selectedPath, treeKey }: { entries: LocalFileEntry[]; onLoadChildren: (folder: string) => Promise<LocalFileEntry[] | undefined>; onSelectFile: (path: string) => void; selectedPath: string | null; treeKey: string }) {
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  return (
    <div className="flex flex-col" key={treeKey}>
      {sortedEntries.map((entry) => (
        <CoworkFileTreeNode entry={entry} key={entry.path} onLoadChildren={onLoadChildren} onSelectFile={onSelectFile} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

function CoworkFileTreeNode({ entry, onLoadChildren, onSelectFile, selectedPath }: { entry: LocalFileEntry; onLoadChildren: (folder: string) => Promise<LocalFileEntry[] | undefined>; onSelectFile: (path: string) => void; selectedPath: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<LocalFileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const childrenCache = useRef<LocalFileEntry[] | null>(null);

  const toggleFolder = async () => {
    if (!entry.isDirectory) return;
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (childrenCache.current) return setChildren(childrenCache.current);
    setLoading(true);
    const loadedChildren = await onLoadChildren(entry.path) ?? [];
    childrenCache.current = loadedChildren;
    setChildren(loadedChildren);
    setLoading(false);
  };

  if (entry.isDirectory) {
    return (
      <>
        <button aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} folder ${entry.name}`} className="group flex w-full items-center gap-1.5 py-1 pl-2 pr-2 text-left text-text-300 transition-colors hover:bg-bg-200 hover:text-text-100" onClick={() => void toggleFolder()} type="button">
          <Icon className="shrink-0 text-text-400" name={expanded ? "CaretDown" : "CaretRight"} size="xs" />
          <span className="truncate text-xs font-normal">{entry.name}</span>
        </button>
        {expanded ? (
          <div className="ml-3 border-l border-dotted border-border-400">
            {loading ? <div className="px-2 py-1 text-xs text-text-500">...</div> : null}
            {children?.map((child) => <CoworkFileTreeNode entry={child} key={child.path} onLoadChildren={onLoadChildren} onSelectFile={onSelectFile} selectedPath={selectedPath} />)}
          </div>
        ) : null}
      </>
    );
  }

  const selected = selectedPath === entry.path;
  return (
    <button className={`flex w-full items-center gap-1.5 rounded-sm py-1 pl-2 pr-2 text-left transition-colors ${selected ? "bg-brand-100 text-oncolor-100" : "text-text-300 hover:bg-bg-300 hover:text-text-100"}`} onClick={() => onSelectFile(entry.path)} title={entry.name} type="button">
      <span className="truncate text-xs">{entry.name}</span>
    </button>
  );
}

function CoworkFilePreviewPane({ onOpenFile, selectedPath }: { onOpenFile: (target: CoworkOpenFileTarget) => void; selectedPath: string | null }) {
  if (!selectedPath) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-border-300 bg-bg-100 px-4 text-center text-sm text-text-500">
        Select a file to preview it.
      </section>
    );
  }
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-300 bg-bg-100">
      <div className="flex items-center gap-2 border-b border-border-300 px-3 py-2">
        <Icon className="text-text-400" name="NoteSquareLines" size="xs" />
        <span className="truncate text-sm font-medium text-text-100">{basename(selectedPath) ?? selectedPath}</span>
      </div>
      <div className="flex flex-1 flex-col items-start justify-center gap-3 px-4 text-sm text-text-500">
        <p className="max-w-full truncate" title={selectedPath}>{selectedPath}</p>
        <OfficialButton onClick={() => onOpenFile({ path: selectedPath })} variant="contained">Open file</OfficialButton>
      </div>
    </section>
  );
}

function CoworkFileExplorerStatus({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-text-500"><span className="sr-only">{label}</span><Icon className="animate-spin" name="Spinner" size="sm" /></div>;
}

function CoworkFileExplorerEmpty() {
  return <div className="flex h-full items-center justify-center px-2 text-center text-xs text-text-500">Folder is empty.</div>;
}

function CoworkFileExplorerIconButton({ ariaLabel, disabled, icon, onClick }: { ariaLabel: string; disabled?: boolean; icon: string; onClick: () => void }) {
  return (
    <button aria-label={ariaLabel} className="inline-flex size-5 items-center justify-center rounded-small text-text-400 hover:bg-bg-200 hover:text-text-200 disabled:opacity-50" disabled={disabled} onClick={onClick} type="button">
      <Icon name={icon} size="xs" />
    </button>
  );
}

export function CoworkBrowseFilesButton({ onBrowse }: { onBrowse: (event: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button aria-label="Browse files" className="inline-flex size-5 items-center justify-center rounded-small text-text-400 hover:bg-bg-200 hover:text-text-200" onClick={onBrowse} type="button">
      <Icon name="ListBullet" size="xs" />
    </button>
  );
}

function sortEntries(entries: LocalFileEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.isDirectory && !right.isDirectory) return -1;
    if (!left.isDirectory && right.isDirectory) return 1;
    return left.name.localeCompare(right.name);
  });
}
