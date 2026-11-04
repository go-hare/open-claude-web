/**
 * Official cd2ef `Yu` body helpers: `Qc` looksBinary, `ll` invalid UTF-8, `nu` preview kind.
 */

/** Official `Qc` — NUL or >2% U+FFFD in the first 8KiB. */
export function officialFileLooksBinary(contents: string): boolean {
  const head = contents.slice(0, 8192);
  if (head.length === 0) return false;
  if (head.includes("\0")) return true;
  let bad = 0;
  for (let i = 0; i < head.length; i++) {
    if (head.charCodeAt(i) === 65533) bad += 1;
  }
  return bad / head.length > 0.02;
}

function utf8ByteLength(value: string, cap = Infinity): number {
  let n = 0;
  for (let i = 0; i < value.length && n <= cap; i++) {
    const code = value.charCodeAt(i);
    if (code < 128) n += 1;
    else if (code < 2048) n += 2;
    else if (code >= 55296 && code < 56320 && (value.charCodeAt(i + 1) & 64512) === 56320) {
      n += 4;
      i += 1;
    } else n += 3;
  }
  return n;
}

/** Official `ll` — replacement chars whose UTF-8 size exceeds fileSize. */
export function officialFileInvalidUtf8(contents: string, fileSize?: number): boolean {
  if (!contents.includes("�")) return false;
  return fileSize === undefined || utf8ByteLength(contents, fileSize) > fileSize;
}

export function officialFileIsEmpty(contents: string | undefined): boolean {
  return contents !== undefined && contents.length === 0;
}

export function officialCsvDelimiter(filePath: string): "," | "\t" | ";" | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsv") || lower.endsWith(".tab")) return "\t";
  if (lower.endsWith(".csv")) return ",";
  if (lower.endsWith(".psv")) return ";";
  return null;
}

export type OfficialYuPreviewKind = "markdown" | "csv" | "text" | null;

/** Official `nu` — preview kind when not binary / forceText. */
export function officialYuPreviewKind(input: {
  csvDelimiter: "," | "\t" | ";" | null;
  forceText?: boolean;
  isMarkdown: boolean;
  isPlainText?: boolean;
  looksBinary: boolean;
}): OfficialYuPreviewKind {
  if (input.looksBinary || input.forceText) return null;
  if (input.csvDelimiter !== null) return "csv";
  if (input.isMarkdown) return "markdown";
  if (input.isPlainText) return "text";
  return null;
}
