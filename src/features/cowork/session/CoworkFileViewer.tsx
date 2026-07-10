import { useEffect, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { CoworkButton } from "../ui/CoworkButton";
import { coworkSessionsBridge } from "./coworkSessionBridge";
import { asRecord, numberValue, stringValue } from "./recordUtils";
import { CoworkMarkdown } from "./transcript/CoworkMarkdown";
import type { CoworkFileTarget } from "./transcript/CoworkTranscriptActions";

export function CoworkFileViewer({ onClose, sessionId, target }: { onClose: () => void; sessionId: string; target: CoworkFileTarget }) {
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({ isLoading: true });
  const [sourceMode, setSourceMode] = useState(false);
  const [copied, setCopied] = useState<"contents" | "path" | null>(null);
  useEffect(() => loadFilePreview(sessionId, target.path, setState), [sessionId, target.path]);
  const title = target.title ?? basename(target.path);
  const copy = (kind: "contents" | "path", value?: string) => {
    if (value === undefined) return;
    void navigator.clipboard?.writeText(value).then(() => { setCopied(kind); window.setTimeout(() => setCopied(null), 1200); });
  };
  return (
    <aside aria-label="File viewer" className="h-full w-[28rem] max-w-[45vw] flex-shrink-0 border-l border-border-300 bg-bg-000">
      <div className="h-full min-w-0 flex flex-col"><div className="flex min-h-[36px] shrink-0 items-center gap-g3 border-b border-border-300 px-p5"><div className="min-w-0 flex-1"><div className="truncate text-body text-t8">{title}</div><div className="truncate text-caption text-t5">{target.path}</div></div>{isMarkdown(target.path) && state.text !== undefined ? <CoworkButton ariaLabel={sourceMode ? "Show preview" : "Show source"} icon={sourceMode ? "Eye" : "Code"} onClick={() => setSourceMode((value) => !value)} pressed={sourceMode} /> : null}<CoworkButton ariaLabel="Copy contents" disabled={state.text === undefined} icon={copied === "contents" ? "CheckSelection" : "CopySquareBehind"} onClick={() => copy("contents", state.text)} /><CoworkButton ariaLabel="Copy path" icon={copied === "path" ? "CheckSelection" : "Link"} onClick={() => copy("path", target.path)} /><CoworkButton ariaLabel="Close file viewer" icon="XCrossCloseMedium" onClick={onClose} /></div><CoworkFileViewerBody sourceMode={sourceMode} state={state} target={target} title={title} /></div>
    </aside>
  );
}

function CoworkFileViewerBody({ sourceMode, state, target, title }: { sourceMode: boolean; state: { dataUrl?: string; error?: string; isLoading: boolean; text?: string }; target: CoworkFileTarget; title: string }) {
  if (state.isLoading) return <div className="flex h-full items-center justify-center gap-g3 text-t5"><Icon className="animate-spin" name="Spinner" size="sm" />Loading file...</div>;
  if (state.error) return <div className="flex h-full items-center justify-center px-p8 text-center text-body text-extended-pink">{state.error}</div>;
  if (state.dataUrl) return <div className="flex min-h-full items-center justify-center p-p8"><img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} /></div>;
  if (isMarkdown(target.path) && !sourceMode) return <div className="select-text overflow-auto px-[24px] py-[16px]"><div className="epitaxy-markdown max-w-[72ch]"><CoworkMarkdown text={state.text ?? ""} /></div></div>;
  if (isHtml(target.path)) return <iframe className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" srcDoc={state.text} title={title} />;
  return <pre className="m-0 min-w-max flex-1 overflow-auto select-text p-p6 font-mono text-code text-t8 leading-[18px] whitespace-pre-wrap">{state.text ?? ""}</pre>;
}

function loadFilePreview(sessionId: string, path: string, setState: (state: { dataUrl?: string; error?: string; isLoading: boolean; text?: string }) => void) {
  let alive = true;
  setState({ isLoading: true });
  const load = isImage(path) && coworkSessionsBridge.readSessionImageAsDataUrl
    ? coworkSessionsBridge.readSessionImageAsDataUrl(sessionId, path).then((dataUrl) => ({ dataUrl: dataUrl ?? undefined }))
    : readPreviewText(sessionId, path).then((text) => ({ text }));
  void load.then((result) => { if (alive) setState({ ...result, isLoading: false }); }).catch((error) => { if (alive) setState({ error: error instanceof Error ? error.message : String(error), isLoading: false }); });
  return () => { alive = false; };
}

async function readPreviewText(sessionId: string, path: string) {
  const sessionValue = await coworkSessionsBridge.readSessionFile?.(sessionId, path).catch(() => null);
  const sessionText = previewText(sessionValue);
  if (sessionText !== null) return sessionText;
  const localValue = await desktopBridge.FileSystem.readLocalFile?.(path).catch(() => null);
  const localText = previewText(localValue);
  if (localText !== null) return localText;
  const cwdResult = await coworkSessionsBridge.readFileAtCwd?.(sessionId, path);
  if (cwdResult?.ok === false) throw new Error(cwdResult.error ?? cwdResult.stderr ?? "Failed to read file");
  return cwdResult?.stdout ?? "";
}

function previewText(value: unknown): string | null {
  if (typeof value === "string") return value;
  const raw = asRecord(value);
  if (raw.tooLarge === true) throw new Error(`File is too large to preview (${numberValue(raw.size)} bytes).`);
  return stringValue(raw.stdout) ?? stringValue(raw.contents) ?? stringValue(raw.content) ?? stringValue(raw.text) ?? null;
}

function isImage(path: string) { return /\.(?:apng|avif|gif|jpe?g|png|svg|webp)$/i.test(path); }
function isHtml(path: string) { return /\.(?:html?|svg)$/i.test(path); }
function isMarkdown(path: string) { return /\.(?:md|mdx|markdown)$/i.test(path); }
function basename(path: string) { return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path; }
