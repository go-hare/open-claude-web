/**
 * Official $v + ml()/EQ(_s) clipboard helpers (c11959232).
 * Copy message: rich text+html; Copy as Markdown: plain writeText.
 */
import { micromark } from "micromark";

export type OfficialClipboardPayload = {
  html?: string;
  text: string;
};

/** Official EQ as `_s`: markdown → html for rich clipboard. */
export function officialMarkdownToHtml(markdown: string): string | undefined {
  try {
    return micromark(markdown);
  } catch {
    return undefined;
  }
}

/** Official $v(text, copyToClipboard). */
export async function copyOfficialMessageRich(
  text: string,
  copyToClipboard: (payload: OfficialClipboardPayload) => void | Promise<void> = writeOfficialClipboard,
): Promise<void> {
  const html = officialMarkdownToHtml(text);
  await copyToClipboard({ text, html });
}

/** Official "Copy as Markdown" path: plain clipboard text only. */
export async function copyOfficialMessagePlain(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) return;
  await navigator.clipboard.writeText(text).catch(() => undefined);
}

/** Desktop-safe write matching official ml() ClipboardItem text/html + text/plain. */
export async function writeOfficialClipboard(payload: OfficialClipboardPayload): Promise<void> {
  const plain = payload.text;
  if (!navigator.clipboard) return;
  if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
    try {
      const items: Record<string, Blob> = {
        "text/plain": new Blob([plain], { type: "text/plain" }),
      };
      if (payload.html) {
        items["text/html"] = new Blob([payload.html], { type: "text/html" });
      }
      await navigator.clipboard.write([new ClipboardItem(items)]);
      return;
    } catch {
      // Official falls back to plain text.
    }
  }
  await navigator.clipboard.writeText(plain).catch(() => undefined);
}
