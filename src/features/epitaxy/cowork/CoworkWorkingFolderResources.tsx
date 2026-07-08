import { useEffect, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { basename, normalizeCoworkPath } from "./coworkResourcePaths";
import type { CoworkResourceActivity } from "./coworkResourceActivity";
import { CoworkResourceList } from "./CoworkResourceRows";
import type { CoworkOpenFileTarget } from "./coworkActivityTypes";

export function CoworkWorkingFolderResources({ folders, instructionRow, onOpenFile, resources, sessionId }: { folders: string[]; instructionRow: ReactNode; onOpenFile: (target: CoworkOpenFileTarget) => void; resources: CoworkResourceActivity[]; sessionId: string }) {
  const [expandedByFolder, setExpandedByFolder] = useState<Record<string, boolean>>({});
  useEffect(() => setExpandedByFolder({}), [sessionId]);
  if (folders.length === 0) return <CoworkResourceList onOpenFile={onOpenFile} resources={resources} />;
  if (folders.length === 1) return resources.length > 0 ? <CoworkResourceList onOpenFile={onOpenFile} resources={resources} /> : null;
  return (
    <div className="flex flex-col gap-1">
      {folders.map((folder, index) => {
        const folderResources = resources.filter((resource) => isResourceInCoworkFolder(resource.filePath, folder));
        const isExpanded = expandedByFolder[folder] ?? index === 0;
        const toggleFolder = () => setExpandedByFolder((current) => ({ ...current, [folder]: !isExpanded }));
        return (
          <div className={isExpanded ? "mb-4 last:mb-0" : undefined} key={folder}>
            <CoworkWorkingFolderHeader folder={folder} isExpanded={isExpanded} onToggle={toggleFolder} />
            {isExpanded && ((index === 0 && instructionRow) || folderResources.length > 0) ? (
              <div className="overflow-hidden pl-5">
                {index === 0 ? instructionRow : null}
                <CoworkResourceList onOpenFile={onOpenFile} resources={folderResources} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function CoworkScratchpadSection({ onOpenFile, resources, sessionId }: { onOpenFile: (target: CoworkOpenFileTarget) => void; resources: CoworkResourceActivity[]; sessionId: string }) {
  const [isExpanded, setExpanded] = useState(true);
  useEffect(() => setExpanded(true), [sessionId]);
  if (resources.length === 0) return null;
  return (
    <div className={`mt-2 -mx-3 px-3 border-t-0.5 border-border-300 pt-2 ${isExpanded ? "pb-1" : "-mb-1"}`}>
      <button aria-expanded={isExpanded} className="flex items-center gap-1 w-full py-1.5 px-1 -mx-1 rounded font-small text-text-500 hover:bg-bg-200 transition-colors" onClick={() => setExpanded((value) => !value)} type="button">
        <span className={`text-text-500 flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0,0,0.2,1)] ${isExpanded ? "rotate-90" : ""}`}>
          <Icon name="CaretRight" customSize={16} />
        </span>
        <span>Scratchpad</span>
      </button>
      {isExpanded ? (
        <div className="overflow-hidden pl-5 pt-1">
          <CoworkResourceList onOpenFile={onOpenFile} resources={resources} />
        </div>
      ) : null}
    </div>
  );
}

function CoworkWorkingFolderHeader({ folder, isExpanded, onToggle }: { folder: string; isExpanded: boolean; onToggle: () => void }) {
  const showFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void desktopBridge.FileSystem.showInFolder?.(folder);
  };
  return (
    <div className="group flex items-center gap-1 py-1.5 px-1 -mx-1 rounded hover:bg-bg-200 transition-colors">
      <button aria-expanded={isExpanded} className="flex items-center gap-1 flex-1 min-w-0 text-left cursor-pointer" onClick={onToggle} type="button">
        <span className={`inline-flex h-5 w-5 items-center justify-center text-text-500 flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0,0,0.2,1)] ${isExpanded ? "rotate-90" : ""}`}>
          <Icon name="CaretRight" size="sm" />
        </span>
        <span className="truncate font-small text-text-500" title={folder}>{basename(folder) ?? folder}</span>
      </button>
      {desktopBridge.FileSystem.showInFolder ? (
        <button aria-label="Go to folder" className="inline-flex size-5 flex-shrink-0 items-center justify-center rounded-small text-text-400 opacity-0 transition-opacity hover:bg-bg-200 hover:text-text-200 group-hover:opacity-100 focus-visible:opacity-100" onClick={showFolder} type="button">
          <Icon name="Folder" size="xs" />
        </button>
      ) : null}
    </div>
  );
}

function isResourceInCoworkFolder(filePath: string, folder: string) {
  const normalizedFolder = normalizeCoworkPath(folder).replace(/\/+$/, "");
  return normalizeCoworkPath(filePath).startsWith(`${normalizedFolder}/`);
}
