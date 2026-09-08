/**
 * Official ozt / rzt / izt residual (index-BELzQL5P.js).
 * Builds the nested file tree for plugin skill files (c63a Ct → Z(r)).
 */

export type SkillFileTreeNode = {
  children?: SkillFileTreeNode[];
  content?: string;
  name: string;
  path: string;
  type: "directory" | "file";
};

export type SkillFileTreeInput = {
  content?: string;
  path: string;
};

/** Official rzt — shared first path segment when every file is nested under it. */
function sharedRootSegment(files: readonly SkillFileTreeInput[]): string | null {
  if (files.length === 0) return null;
  const first = files[0]?.path.split("/").filter(Boolean) ?? [];
  if (first.length === 0) return null;
  const segment = first[0];
  return files.every((file) => {
    const parts = file.path.split("/").filter(Boolean);
    return parts.length > 1 && parts[0] === segment;
  })
    ? segment ?? null
    : null;
}

/** Official izt — directories first, then localeCompare. */
function sortTree(node: SkillFileTreeNode): void {
  if (!node.children) return;
  node.children.sort((left, right) => {
    if (left.type === "directory" && right.type !== "directory") return -1;
    if (left.type !== "directory" && right.type === "directory") return 1;
    return left.name.localeCompare(right.name);
  });
  for (const child of node.children) sortTree(child);
}

function promoteSkillMd(children: SkillFileTreeNode[]): void {
  const index = children.findIndex((row) => row.name === "SKILL.md");
  if (index > 0) {
    const [skill] = children.splice(index, 1);
    if (skill) children.unshift(skill);
  }
}

/** Official ozt. Empty input → null (rzt/Ct skip). */
export function buildSkillFileTree(
  files: readonly SkillFileTreeInput[],
): SkillFileTreeNode | null {
  if (files.length === 0) return null;
  const prefix = sharedRootSegment(files);
  const root: SkillFileTreeNode = {
    name: "",
    path: "",
    type: "directory",
    children: [],
  };
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    if (prefix && parts[0] === prefix) parts.shift();
    if (parts.length === 0) continue;
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index] ?? "";
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join("/");
      cursor.children ??= [];
      let child = cursor.children.find((row) => row.name === name);
      if (!child) {
        child = {
          name,
          path,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
          content: isFile ? file.content : undefined,
        };
        cursor.children.push(child);
      }
      cursor = child;
    }
  }
  sortTree(root);
  if (root.children) promoteSkillMd(root.children);
  return root;
}
