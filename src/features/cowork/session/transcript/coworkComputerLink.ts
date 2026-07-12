/**
 * Official assistant markdown computer:// handler (index-BELzQL5P.pretty.js ~136785):
 * if url.startsWith("computer://") → preventDefault + SELECT_FILE(path) + open drawer.
 * toolType official uses "create_file" for this path.
 */
export function coworkComputerLinkPath(url: string): string | null {
  if (!url.startsWith("computer://")) return null;
  const raw = url.slice("computer://".length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
