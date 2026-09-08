/**
 * Official c4101dbe9 FileTreeSidebar `E` (imported as ct in c63a Ct).
 * variant="settings": hover:bg-bg-300 / selected bg-bg-400, indent 16*depth+8.
 */
import { useCallback, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { useCustomizeText } from "../customizeMessages";
import type { SkillFileTreeNode } from "./buildSkillFileTree";

export function useSkillFileExpandedFolders(
  initial: Set<string> = new Set(),
): [Set<string>, (path: string) => void] {
  const [expanded, setExpanded] = useState(initial);
  const toggle = useCallback((path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);
  return [expanded, toggle];
}

export function PluginSkillFileTree({
  className,
  expandedFolders,
  fileTree,
  onFileSelect,
  onToggleFolder,
  selectedPath,
}: {
  className?: string;
  expandedFolders: Set<string>;
  fileTree: SkillFileTreeNode;
  onFileSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  selectedPath?: string | null;
}) {
  const text = useCustomizeText();
  const hover = "hover:bg-bg-300";
  const selected = "bg-bg-400";

  const renderNode = (node: SkillFileTreeNode, depth: number): ReactNode => {
    if (!node.name) {
      return (
        <>
          {node.children?.map((child) => (
            <div key={child.path}>{renderNode(child, depth)}</div>
          ))}
        </>
      );
    }
    const isDirectory = node.type === "directory";
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const pad = 16 * depth + 8;
    if (isDirectory) {
      return (
        <>
          <button
            aria-expanded={isExpanded}
            aria-label={text.skillFolderAria.replace("{name}", node.name)}
            className={[
              "w-full px-2 py-1 rounded-lg flex items-center justify-between transition-colors text-text-300 hover:text-text-100 -outline-offset-2",
              hover,
            ].join(" ")}
            onClick={() => onToggleFolder(node.path)}
            style={{ paddingLeft: `${pad}px` }}
            type="button"
          >
            <OfficialTooltip side="top" sideOffset={4} tooltipContent={node.name}>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex-shrink-0 w-3.5 h-3.5">
                  <Icon customSize={14} name="Folder" />
                </div>
                <div className="text-left text-sm font-normal truncate">{node.name}</div>
              </div>
            </OfficialTooltip>
            <div className="w-3.5 h-3.5 flex-shrink-0 ml-1.5">
              {isExpanded ? (
                <Icon customSize={14} name="CaretDown" />
              ) : (
                <Icon customSize={14} name="CaretRight" />
              )}
            </div>
          </button>
          {isExpanded && node.children ? (
            <div className="flex flex-col gap-1">
              {node.children.map((child) => (
                <div key={child.path}>{renderNode(child, depth + 1)}</div>
              ))}
            </div>
          ) : null}
        </>
      );
    }
    return (
      <OfficialTooltip side="top" sideOffset={4} tooltipContent={node.name}>
        <button
          aria-current={isSelected ? "page" : undefined}
          className={[
            "w-full py-1 rounded-lg inline-flex justify-start items-center gap-2 transition-colors -outline-offset-2",
            isSelected
              ? `${selected} text-text-100 font-semibold`
              : `${hover} text-text-300 hover:text-text-100 font-normal`,
          ].join(" ")}
          onClick={() => onFileSelect(node.path)}
          style={{ paddingLeft: `${pad - 16 + 20}px` }}
          type="button"
        >
          <div className="flex-1 min-w-0 text-left text-sm truncate">{node.name}</div>
        </button>
      </OfficialTooltip>
    );
  };

  return (
    <div className={["w-60 flex-shrink-0 overflow-y-auto", className ?? ""].filter(Boolean).join(" ")}>
      <div className="flex flex-col gap-1">{renderNode(fileTree, 0)}</div>
    </div>
  );
}
