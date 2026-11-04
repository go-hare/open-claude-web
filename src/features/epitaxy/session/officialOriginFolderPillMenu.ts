/**
 * Official ca80 `vB` / `yB` origin-pill menu groups.
 *
 * extraItems (Show in Finder) | Copy path / Copy submenu + Change folder… | Open in terminal
 * First item of a later non-empty group gets `separatorBefore`.
 */

export type OfficialOriginFolderMenuItem = {
  items?: OfficialOriginFolderMenuItem[];
  label: string;
  onSelect?: () => void;
  separatorBefore?: boolean;
};

/** Official ca80 `yB` — first item of a later group gets separatorBefore. */
export function officialYbMenuItems<T extends { separatorBefore?: boolean }>(groups: T[][]): T[] {
  const items: T[] = [];
  for (const group of groups) {
    group.forEach((item, index) => {
      items.push(index === 0 && items.length > 0 ? { ...item, separatorBefore: true } : item);
    });
  }
  return items;
}

/** Official hB UNC probe — network shares cannot be a session cwd (WSL UNC is allowed). */
export function officialOriginFolderIsRejectedUnc(path: string): boolean {
  const isUnc = /^(?:[\\/]{2}|[\\/]\?\?[\\/])/.test(path);
  const isWsl = /^[\\/]{2}(wsl\$|wsl\.localhost)([\\/]|$)/i.test(path);
  return isUnc && !isWsl;
}

export function officialOriginFolderRewriteWslUnc(path: string): string {
  return path.replace(/^[\\/]{2}wsl\$(?=[\\/])/i, "\\\\wsl.localhost");
}

export function officialOriginFolderBasename(path: string): string {
  const trimmed = path.endsWith("/") || path.endsWith("\\") ? path.slice(0, -1) : path;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

export function officialOriginFolderLabel(session: {
  cwd?: string;
  repo?: { name?: string };
} | null): string | undefined {
  const repo = session?.repo?.name?.trim();
  if (repo) return repo;
  const cwd = session?.cwd?.trim();
  if (!cwd) return undefined;
  return officialOriginFolderBasename(cwd) || undefined;
}

export type OfficialOriginFolderFilesCarried = {
  alreadyThere?: number;
  copied?: number;
  notCopied?: number;
  outcome?: string;
};

/** Official ca80 `mB` + `pB` move toast. */
export function officialOriginFolderMovedToast(
  messages: {
    sessionMovedPlain: string;
    sessionMovedAll: string;
    sessionMovedSome: string;
    sessionMovedTooMany: string;
    sessionMovedFailed: string;
  },
  directory: string,
  filesCarried: OfficialOriginFolderFilesCarried | undefined,
  format: (message: string, values: Record<string, string | number>) => string,
): string {
  if (!filesCarried) return format(messages.sessionMovedPlain, { directory });
  if (filesCarried.outcome === "too_many") return format(messages.sessionMovedTooMany, { directory });
  const copied = filesCarried.copied ?? 0;
  const alreadyThere = filesCarried.alreadyThere ?? 0;
  const notCopied = filesCarried.notCopied ?? 0;
  if (filesCarried.outcome === "failed" || (copied === 0 && notCopied > 0)) {
    return format(messages.sessionMovedFailed, { directory });
  }
  if (copied === 0) return format(messages.sessionMovedPlain, { directory });
  if (alreadyThere + notCopied === 0) {
    return format(messages.sessionMovedAll, { directory, count: copied });
  }
  return format(messages.sessionMovedSome, {
    directory,
    count: copied,
    total: copied + alreadyThere + notCopied,
  });
}
