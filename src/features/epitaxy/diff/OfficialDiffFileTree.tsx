import { useCallback, useMemo, useState } from "react";
import { Icon } from "../../../shell/icons";

/**
 * Official Code diff file tree (c11959232 `Xh` / `Bh` / `Gh` / `Kh`):
 * - directory collapse + path nesting
 * - file rows show +additions / -deletions (not status letter)
 * - active file: bg-fill-uncontained-selected
 */

export type OfficialDiffTreeFile = {
  additions: number;
  deletions: number;
  filePath: string;
};

type TreeDirNode = {
  children: TreeNode[];
  kind: "dir";
  name: string;
  path: string;
};

type TreeFileNode = {
  additions: number;
  deletions: number;
  kind: "file";
  name: string;
  path: string;
};

type TreeNode = TreeDirNode | TreeFileNode;

const ROW =
  "flex items-center gap-g3 h-base pr-p6 rounded-r4 text-body text-left w-full outline-none hide-focus-ring ring-focus";
const ROW_IDLE = "bg-fill-uncontained-default text-uncontained-default hover:bg-fill-uncontained-hover hover:text-uncontained-hover";
const ROW_ACTIVE = "bg-fill-uncontained-selected text-uncontained-selected";

export function OfficialDiffFileTree({
  activePath,
  files,
  onSelectFile,
}: {
  activePath: string | null;
  files: OfficialDiffTreeFile[];
  onSelectFile: (filePath: string) => void;
}) {
  const roots = useMemo(() => buildFileTree(files), [files]);
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const onToggle = useCallback((path: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto px-p6 py-p6">
      {roots.map((node) => (
        <TreeNodeRow
          key={node.path}
          activePath={activePath}
          collapsed={collapsed}
          depth={0}
          node={node}
          onClickFile={onSelectFile}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function TreeNodeRow({
  activePath,
  collapsed,
  depth,
  node,
  onClickFile,
  onToggle,
}: {
  activePath: string | null;
  collapsed: Set<string>;
  depth: number;
  node: TreeNode;
  onClickFile: (filePath: string) => void;
  onToggle: (path: string) => void;
}) {
  const pad = { paddingLeft: 8 + 12 * depth } as const;
  if (node.kind === "dir") {
    const isCollapsed = collapsed.has(node.path);
    return (
      <>
        <button
          type="button"
          style={pad}
          aria-expanded={!isCollapsed}
          className={`${ROW} ${ROW_IDLE}`}
          onClick={() => onToggle(node.path)}
        >
          <Icon className="shrink-0 text-t6" name={isCollapsed ? "Folder1" : "Folder1Open"} size="s" />
          <span className="truncate">{node.name}</span>
        </button>
        {!isCollapsed
          ? node.children.map((child) => (
              <TreeNodeRow
                key={child.path}
                activePath={activePath}
                collapsed={collapsed}
                depth={depth + 1}
                node={child}
                onClickFile={onClickFile}
                onToggle={onToggle}
              />
            ))
          : null}
      </>
    );
  }

  const active = activePath === node.path;
  return (
    <button
      type="button"
      style={pad}
      aria-current={active || undefined}
      className={`${ROW} ${active ? ROW_ACTIVE : ROW_IDLE}`}
      onClick={() => onClickFile(node.path)}
    >
      <span className="truncate min-w-0 flex-1">{node.name}</span>
      <span className="flex items-center gap-g1 text-footnote shrink-0">
        <span className="text-extended-green">{`+${node.additions}`}</span>
        <span className="text-extended-pink">{`-${node.deletions}`}</span>
      </span>
    </button>
  );
}

/** Official `Bh` + `Kh` (collapse single-child dirs into `a/b`). */
function buildFileTree(files: OfficialDiffTreeFile[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const dirs = new Map<string, TreeNode[]>([["", roots]]);

  for (const file of files) {
    const parts = file.filePath.split("/");
    const name = parts.pop() ?? file.filePath;
    let prefix = "";
    let bucket = roots;
    for (const part of parts) {
      const path = prefix ? `${prefix}/${part}` : part;
      let children = dirs.get(path);
      if (!children) {
        children = [];
        dirs.set(path, children);
        bucket.push({ kind: "dir", name: part, path, children });
      }
      prefix = path;
      bucket = children;
    }
    bucket.push({
      kind: "file",
      name,
      path: file.filePath,
      additions: file.additions,
      deletions: file.deletions,
    });
  }

  return collapseSingleChildDirs(roots);
}

function collapseSingleChildDirs(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => {
    if (node.kind !== "dir") return node;
    const children = collapseSingleChildDirs(node.children);
    if (children.length === 1 && children[0].kind === "dir") {
      const only = children[0];
      return {
        kind: "dir",
        name: `${node.name}/${only.name}`,
        path: only.path,
        children: only.children,
      };
    }
    return { ...node, children };
  });
}
