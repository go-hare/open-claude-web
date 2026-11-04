/**
 * Official c9a `ku` / `Cu` / `_u` / `Au` path helpers.
 * `ku(absPath, relPath, {line, isDirectory})` — Files XC tree (`wu`).
 * `Cu({absPath, relPath, mentionPath, line})` — transcript markdown file-ref (`Eu`).
 *
 * Named `officialKuFileMenuPaths` (not officialKuFileMenu) so macOS APFS
 * does not collide with OfficialKuFileMenu.tsx.
 */

export function officialKuBasename(absPath: string): string {
  const trimmed = absPath.endsWith("/") || absPath.endsWith("\\") ? absPath.slice(0, -1) : absPath;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/** Official Au `toAbs` / Diff `officialDiffAbsPath`. */
export function officialKuAbsPath(cwd: string | null | undefined, filePath: string): string {
  if (!filePath) return filePath;
  if (filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath)) return filePath;
  if (!cwd) return filePath;
  return `${cwd.replace(/[\\/]+$/, "")}/${filePath.replace(/^[\\/]+/, "")}`;
}

export function officialKuRelPath(cwd: string | null | undefined, absPath: string): string {
  if (!cwd || !absPath) return absPath;
  const root = cwd.replace(/[\\/]+$/, "");
  if (absPath === root) return "";
  if (absPath.startsWith(`${root}/`)) return absPath.slice(root.length + 1);
  if (absPath.startsWith(`${root}\\`)) return absPath.slice(root.length + 1);
  return absPath;
}
