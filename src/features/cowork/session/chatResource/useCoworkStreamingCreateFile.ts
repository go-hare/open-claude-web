/**
 * Official l$t (index-BELzQL5P.pretty.js ~226770–226941).
 *
 * Current ion-dist candidate extraction is:
 *   const d = n.useMemo(() => null, [c, i])
 * so this bundle never SELECT/expand/UPDATE-stream from streaming create_file.
 *
 * Keep pure helpers (isMarkdownCreatePath) for tests and future re-enable when
 * official l$t ships a non-null detector. Do not wire auto-open side effects here.
 */

/**
 * Official markdown path gate used by l$t / Lme / i$t when auto-open is live.
 * Still exported for parity tests; production auto-open remains disabled.
 */
export function isMarkdownCreatePath(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path.split(/[/\\]/).pop() ?? path);
}

/**
 * Official l$t hook surface — no-op while candidate useMemo returns null.
 * Call sites must not expect SELECT_FILE / drawer expand from streaming create_file.
 */
export function useCoworkStreamingCreateFile(_args?: {
  isResponding?: boolean;
  messages?: unknown;
  streamSnapshot?: unknown;
}): void {
  // Official: streamingCreateFile candidate is null in this bundle.
}
