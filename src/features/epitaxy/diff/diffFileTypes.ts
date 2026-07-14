/**
 * Official c9a932a07 `tc` file-list entry (imported as `Yd` in c11959232 `ng`):
 * `{ filePath, rawFile, contentHash, status, additions, deletions }`
 * where `rawFile` is the comparison file (`filename`/`patch`/`previous_filename`/…).
 */
export type OfficialRawDiffFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes?: number;
  patch?: string;
  previous_filename?: string;
};

export type OfficialDiffFileEntry = {
  filePath: string;
  rawFile: OfficialRawDiffFile;
  contentHash: string;
  status: string;
  additions: number;
  deletions: number;
};

/** Official scroll-target data attribute (`Jd` / `jc` = `data-diff-file-path`). */
export const OFFICIAL_DIFF_FILE_ATTR = "data-diff-file-path";

/**
 * Official `tc(comparison)`:
 * only files with `patch` become rows; contentHash = hash(patch).
 */
export function mapOfficialComparisonToFileEntries(
  comparison: { files?: OfficialRawDiffFile[] } | null | undefined,
): OfficialDiffFileEntry[] {
  if (!comparison?.files?.length) return [];
  const out: OfficialDiffFileEntry[] = [];
  for (const file of comparison.files) {
    if (!file.patch) continue;
    out.push({
      filePath: file.filename,
      rawFile: file,
      contentHash: hashPatch(file.patch),
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    });
  }
  return out;
}

/** Lightweight stable content hash for Pierre cacheKey (official `m(n.patch)`). */
function hashPatch(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
}
