/**
 * Official c11959232 `vN` side-pane file viewer (not the tool-row Read card).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject } from "react";
import { File as PierreFile, type FileContents } from "@pierre/diffs/react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  OfficialDropdownButton,
  type OfficialDropdownItem,
} from "../OfficialEpitaxyComponents";
import { MarkdownContent } from "../OfficialCodeMarkdown";
import { officialPierreLangFromPath } from "../diff/officialPierreLang";
import { useOfficialPierreTheme, useWorkerPool } from "../diff/OfficialPierreWorkerPool";
import { pierreTokenPaintOnPostRender } from "../diff/pierreTokenPaint";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import {
  OFFICIAL_FILE_UNREADABLE_MESSAGE,
  OfficialPaneSubheader,
  isHtmlPreviewPath,
  isMarkdownPreviewPath,
  isPreviewImagePath,
  officialShowInFolderLabel,
  previewReadError,
  readPreviewText,
} from "./officialFilePreviewUtils";

export type OfficialFileViewTarget = {
  findQuery?: string;
  line?: number;
  path: string;
  scrollNonce?: number;
  title?: string;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

const OFFICIAL_FILE_FIND_MATCH_CAP = 1000;

/** Official c119 `dN` — find-in-file state for side file pane. */
function useOfficialFileFind(contents: string | undefined) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryRaw] = useState("");
  const [index, setIndex] = useState(-1);
  const [scrollNonce, setScrollNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const matches = useMemo(() => {
    if (!isOpen || !contents || query.length === 0) return [] as number[];
    const needle = query.toLowerCase();
    const lines = contents.split("\n");
    const out: number[] = [];
    for (let i = 0; i < lines.length && out.length < OFFICIAL_FILE_FIND_MATCH_CAP; i++) {
      if (lines[i].toLowerCase().includes(needle)) out.push(i + 1);
    }
    return out;
  }, [contents, isOpen, query]);

  useEffect(() => {
    if (index >= 0 && index >= matches.length) {
      setIndex(matches.length > 0 ? matches.length - 1 : -1);
    }
  }, [index, matches.length]);

  const setQuery = useCallback((value: string) => {
    setQueryRaw(value);
    setIndex(value.length > 0 ? 0 : -1);
    setScrollNonce((n) => n + 1);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQueryRaw("");
    setIndex(-1);
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      setIndex((prev) => {
        const base = prev < 0 ? (delta === 1 ? -1 : 0) : prev;
        return (base + delta + matches.length) % matches.length;
      });
      setScrollNonce((n) => n + 1);
    },
    [matches.length],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  return {
    close,
    index,
    inputRef,
    isOpen,
    matches,
    next,
    open,
    prev,
    query,
    scrollNonce,
    setQuery,
  };
}

/** Official c119 `uN` EpitaxyFileFindBar. */
function OfficialFileFindBar({
  find,
}: {
  find: {
    close: () => void;
    index: number;
    inputRef: MutableRefObject<HTMLInputElement | null>;
    matches: number[];
    next: () => void;
    prev: () => void;
    query: string;
    setQuery: (value: string) => void;
  };
}) {
  const hasMatches = find.matches.length > 0;
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        find.close();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey) find.prev();
        else find.next();
      }
    },
    [find],
  );

  return (
    <OfficialPaneSubheader role="search">
      <input
        ref={find.inputRef}
        value={find.query}
        onChange={(event) => find.setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoFocus
        aria-label="Find in file"
        placeholder="Find in file…"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none hide-focus-ring text-body text-t8 placeholder:text-t6"
      />
      <span aria-live="polite" className="text-footnote text-t6 tabular-nums">
        {find.query.length === 0
          ? ""
          : hasMatches
            ? `${find.index >= 0 ? find.index + 1 : 0} of ${find.matches.length >= OFFICIAL_FILE_FIND_MATCH_CAP ? "1000+" : find.matches.length}`
            : "No results"}
      </span>
      <OfficialButton size="small" icon="ChevronUpSmall" ariaLabel="Previous match" onClick={find.prev} disabled={!hasMatches} />
      <OfficialButton size="small" icon="ChevronDownSmall" ariaLabel="Next match" onClick={find.next} disabled={!hasMatches} />
      <OfficialButton size="small" icon="XCrossCloseMedium" ariaLabel="Close find bar" onClick={find.close} />
    </OfficialPaneSubheader>
  );
}


/**
 * Official c11959232 `vN` side-pane file viewer (not the tool-row Read card).
 *
 * Structure:
 *   div.h-full.flex.flex-col.overflow-hidden
 *     lN epitaxy-pane-subheader
 *       button.text-code.text-t6.truncate.flex-1  (full path → copy path)
 *       view: [md Eye/代码] [Pencil when F] [Open in… Folder1Open] [CopySquareBehind]
 *       edit: Cancel + Save
 *     [uN find bar when findQuery / open]
 *     body: textarea | markdown | pierre File under epitaxy-diff
 *
 * Tile chrome title is VR "File" (renderSidePaneTitle), not basename.
 * F = session local/bridge + writeSessionFile + hash defined (c119).
 * Note: official JS mounts Find with icon:"搜索", but 汉化 icon table has no 搜索/*
 * path → empty SVG; user screenshots show no magnifier. Match visible chrome.
 */
export function OfficialFilePane({ bridge, fileView, sessionRef }: { bridge: LocalSessionsBridge; fileView: OfficialFileViewTarget | null; sessionRef: EpitaxySessionRef | null }) {
  const [state, setState] = useState<{
    absPath?: string;
    dataUrl?: string;
    error?: string;
    hash?: string;
    isLoading: boolean;
    text?: string;
    unreadable?: boolean;
  }>({ isLoading: false });
  // Official b: editing
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editBaseHash, setEditBaseHash] = useState<string | undefined>(undefined);
  const [saveError, setSaveError] = useState<{ currentHash?: string; isDenied?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  // Official: M = sourceMode for markdown; default true when line/findQuery present.
  const [sourceMode, setSourceMode] = useState(() => Boolean(fileView?.line || fileView?.findQuery));
  const [copiedContents, setCopiedContents] = useState(false);
  const filePath = fileView?.path ?? "";
  const isMarkdown = isMarkdownPreviewPath(filePath);
  // Official S = k && !M && !b  → markdown rendered preview when not source and not editing.
  const markdownPreview = isMarkdown && !sourceMode && !editing && state.text !== undefined;
  const theme = useOfficialPierreTheme();
  const workerPool = useWorkerPool();
  const find = useOfficialFileFind(editing ? undefined : state.text);
  const fileBodyRef = useRef<HTMLDivElement | null>(null);
  const lastLineScrollKey = useRef<string | undefined>(undefined);
  const pierreFile = useMemo<FileContents | null>(() => {
    if (editing || state.text === undefined) return null;
    return {
      name: filePath,
      contents: state.text,
      lang: officialPierreLangFromPath(basename(filePath) ?? filePath) as FileContents["lang"],
    };
  }, [editing, filePath, state.text]);
  // Official Z: { theme, disableFileHeader:true, overflow:"wrap" }
  // package 1.2: onPostRender token paint (FileRenderer.hydrate marks highlighted early).
  const pierreOptions = useMemo(
    () => ({
      theme,
      disableFileHeader: true,
      overflow: "wrap" as const,
      onPostRender: pierreTokenPaintOnPostRender,
    }),
    [theme],
  );

  // Official F: null!==t && remote!==type && writeSessionFile && hash defined.
  const canEdit =
    Boolean(sessionRef) &&
    sessionRef?.type !== "remote" &&
    Boolean(bridge.writeSessionFile) &&
    state.hash !== undefined &&
    state.text !== undefined;

  // Official D: draft equals loaded contents (normalized newlines).
  const draftUnchanged =
    editing &&
    state.text !== undefined &&
    draft.replace(/\r\n/g, "\n") === state.text.replace(/\r\n/g, "\n");

  useEffect(() => {
    // Official: k && C(void 0!==o||!!l) when path/line/find changes
    if (isMarkdownPreviewPath(fileView?.path ?? "")) {
      setSourceMode(Boolean(fileView?.line || fileView?.findQuery));
    }
    setEditing(false);
    setDraft("");
    setEditBaseHash(undefined);
    setSaveError(null);
  }, [fileView?.path, fileView?.line, fileView?.findQuery, fileView?.scrollNonce]);

  // Official: when find opens on markdown preview (S), force source mode.
  useEffect(() => {
    if (find.isOpen && markdownPreview) setSourceMode(true);
  }, [find.isOpen, markdownPreview]);

  // Official: external findQuery + scrollNonce auto-opens find bar.
  const findOpen = find.open;
  const findSetQuery = find.setQuery;
  useEffect(() => {
    const q = fileView?.findQuery;
    if (!q || state.text === undefined || editing) return;
    findOpen();
    findSetQuery(q);
  }, [editing, fileView?.findQuery, fileView?.scrollNonce, state.text, findOpen, findSetQuery]);

  useEffect(() => {
    let alive = true;
    if (!fileView || !sessionRef) {
      setState({ isLoading: false });
      return () => {
        alive = false;
      };
    }

    setState({ isLoading: true });
    const load = isPreviewImagePath(fileView.path)
      ? bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, fileView.path).then((dataUrl) => {
            if (!dataUrl) return { unreadable: true as const };
            return { dataUrl };
          })
        : Promise.resolve({ unreadable: true as const })
      : readPreviewText(bridge, sessionRef.id, fileView.path);
    void load
      .then((result) => {
        if (!alive) return;
        setState({ ...result, isLoading: false });
      })
      .catch((error) => {
        if (!alive) return;
        const normalized = previewReadError(error, fileView.path);
        setState({
          isLoading: false,
          unreadable: normalized.unreadable,
          error: normalized.unreadable ? undefined : normalized.message,
        });
      });
    return () => {
      alive = false;
    };
  }, [bridge, fileView, fileView?.scrollNonce, sessionRef]);

  // Official ⌘/Ctrl+E → edit when F and not already editing.
  useEffect(() => {
    if (!canEdit || editing) return;
    const onKey = (event: KeyboardEvent) => {
      if (editing) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "e" || event.shiftKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      if (state.text === undefined || state.hash === undefined) return;
      setDraft(state.text);
      setEditBaseHash(state.hash);
      setSaveError(null);
      setEditing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, editing, state.hash, state.text]);

  // Official gN/hN-lite: scroll target line into view (line prop or current find match).
  const activeFindLine = find.index >= 0 && find.index < find.matches.length ? find.matches[find.index] : undefined;
  useEffect(() => {
    if (editing) return;
    const root = fileBodyRef.current;
    if (!root || !pierreFile) return;
    const targetLine = activeFindLine ?? fileView?.line;
    if (targetLine == null) return;
    const key = `${targetLine}:${activeFindLine != null ? find.scrollNonce : fileView?.scrollNonce ?? 0}:${filePath}`;
    if (activeFindLine == null && lastLineScrollKey.current === key) return;

    let frames = 0;
    let raf = 0;
    const tick = () => {
      const scope = (root.querySelector("diffs-container") as Element | null)?.shadowRoot ?? root;
      const el = scope.querySelector(`[data-line="${targetLine}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        if (activeFindLine == null) lastLineScrollKey.current = key;
        return;
      }
      if (++frames > 60) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeFindLine, editing, filePath, fileView?.line, fileView?.scrollNonce, find.scrollNonce, pierreFile]);

  const beginEdit = () => {
    if (state.text === undefined || state.hash === undefined) return;
    setDraft(state.text);
    setEditBaseHash(state.hash);
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft("");
    setEditBaseHash(undefined);
    setSaveError(null);
  };

  const saveEdit = async (expectedHash?: string) => {
    if (!sessionRef || !bridge.writeSessionFile) return;
    setSaving(true);
    try {
      const targetPath = state.absPath ?? filePath;
      const result = await bridge.writeSessionFile(sessionRef.id, targetPath, draft, expectedHash);
      if (!result) {
        setSaveError({ currentHash: undefined });
        return;
      }
      if (result.status === "denied") {
        setSaveError({ currentHash: undefined, isDenied: true });
        return;
      }
      if (result.status === "conflict") {
        setSaveError({ currentHash: result.currentHash });
        return;
      }
      setState((prev) => ({
        ...prev,
        text: draft,
        hash: result.hash ?? prev.hash,
        absPath: result.absPath ?? prev.absPath,
      }));
      setEditing(false);
      setDraft("");
      setEditBaseHash(undefined);
      setSaveError(null);
    } finally {
      setSaving(false);
    }
  };

  // Official ae(): clipboard path (+ toast "Path copied to clipboard." when toast host exists).
  const copyPath = () => {
    if (!filePath) return;
    void navigator.clipboard?.writeText(filePath).catch(() => undefined);
  };
  // Official ne(): copy file contents via copyToClipboard (button shows Copied)
  const copyContents = () => {
    const text = editing ? draft : state.text;
    if (text === undefined) return;
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedContents(true);
        window.setTimeout(() => setCopiedContents(false), 1200);
      })
      .catch(() => undefined);
  };

  if (!fileView) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g5 px-p8 text-center text-body text-t6">
        <Icon name="NoteSquareLines" size="lg" />
        <div>Select a file from a tool result to view it here.</div>
      </div>
    );
  }

  // Official loading: before subheader chrome
  if (state.isLoading) {
    return (
      <div role="status" className="h-full flex items-center justify-center text-t5">
        <OfficialSpinner size="l" className="size-[24px]" />
        <span className="sr-only">Loading file</span>
      </div>
    );
  }

  // Official !ee unreadable — no subheader
  if (state.unreadable || (state.text === undefined && !state.dataUrl && !state.error)) {
    return (
      <div className="h-full flex items-center justify-center px-p8 text-body text-t6 text-center text-balance select-text">
        {OFFICIAL_FILE_UNREADABLE_MESSAGE}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">{state.error}</div>
    );
  }

  // Official yu(c9a): editorItems under header "Open in"; showInFolder as extraItems ("Show in Finder/Explorer").
  const canOpenInEditor = Boolean(bridge.openInEditor);
  const canShowInFolder = Boolean(desktopBridge.FileSystem.showInFolder);
  const editorItems: OfficialDropdownItem[] = canOpenInEditor
    ? [
        {
          label: "Editor",
          onSelect: () => {
            void bridge.openInEditor?.(filePath, undefined, fileView.line);
          },
        },
      ]
    : [];
  const extraItems: OfficialDropdownItem[] = canShowInFolder
    ? [
        {
          label: officialShowInFolderLabel(),
          onSelect: () => {
            void desktopBridge.FileSystem.showInFolder?.(filePath);
          },
        },
      ]
    : [];
  const hasOpenIn = editorItems.length > 0 || extraItems.length > 0;
  const openInHeader = editorItems.length > 0 ? "Open in" : undefined;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Official lN — epitaxy-pane-subheader (not custom border-b dual-line header) */}
      <OfficialPaneSubheader>
        <button
          type="button"
          onClick={copyPath}
          title="Copy path"
          // Official path control: no permanent fill (only hover:bg-t2). Without bg-transparent
          // UA/default button chrome can look like a search field next to the Search icon.
          className="bg-transparent border-0 text-code text-t6 truncate flex-1 min-w-0 text-left rounded-r2 px-p2 -mx-[var(--p2)] hover:bg-t2 cursor-default outline-none hide-focus-ring ring-focus"
        >
          {filePath}
        </button>
        {editing ? (
          <>
            <OfficialButton size="small" disabled={saving} onClick={cancelEdit}>
              Cancel
            </OfficialButton>
            <OfficialButton
              size="small"
              variant="contained"
              disabled={saving || draftUnchanged || Boolean(saveError)}
              onClick={() => {
                void saveEdit(editBaseHash);
              }}
            >
              Save
            </OfficialButton>
          </>
        ) : (
          <>
            {isMarkdown ? (
              <OfficialButton
                size="small"
                ariaLabel={sourceMode ? "Preview markdown" : "View source"}
                // Official vN: icon M?"Eye":"代码" (c119). 汉化 prop is 代码; path table only has Code.
                icon={sourceMode ? "Eye" : "代码"}
                onClick={() => setSourceMode((value) => !value)}
              />
            ) : null}
            {/*
              Official vN always mounts Find: yd icon:"搜索" (c119).
              Official Icon (c87b) looks up paths as `${name}/s/outline` with NO alias —
              key 搜索/s/outline does not exist (only Search/s/outline), so the 汉化 app paints
              an empty SVG. Screenshot shows path + Pencil + Folder + Copy with no magnifier.
              Keep find state/bar for findQuery + ⌘F (dN claims find-in-page); do not show a
              visible Search glyph that the running official package does not.
            */}
            {canEdit ? (
              <OfficialButton size="small" ariaLabel="Edit file" icon="Pencil" onClick={beginEdit} />
            ) : null}
            {hasOpenIn ? (
              <OfficialDropdownButton
                size="small"
                icon="Folder1Open"
                revealChevron="never"
                ariaLabel="Open in…"
                align="end"
                header={openInHeader}
                items={editorItems}
                extraSections={extraItems.length > 0 ? [{ items: extraItems }] : undefined}
              />
            ) : null}
            <OfficialButton
              size="small"
              ariaLabel={copiedContents ? "Copied" : "Copy file contents"}
              icon={copiedContents ? "CheckSelection" : "CopySquareBehind"}
              onClick={copyContents}
              disabled={state.text === undefined}
            />
          </>
        )}
      </OfficialPaneSubheader>

      {!editing && !markdownPreview && find.isOpen ? <OfficialFileFindBar find={find} /> : null}

      {editing && saveError ? (
        <div role="alert" className="shrink-0 px-p6 py-p4 bg-t2 backdrop-blur-[20px] flex items-center gap-g3">
          <span className="flex-1 text-body text-t8">
            {saveError.isDenied
              ? "This file can't be saved — its path is outside the session folder, or this is a remote session."
              : "This file changed on disk since you started editing."}
          </span>
          <OfficialButton variant="muted" size="small" onClick={cancelEdit} disabled={saving}>
            Discard
          </OfficialButton>
          {!saveError.isDenied ? (
            <OfficialButton
              variant="contained"
              size="small"
              disabled={saving}
              onClick={() => {
                void saveEdit(saveError.currentHash);
              }}
            >
              Override
            </OfficialButton>
          ) : null}
        </div>
      ) : null}

      {state.dataUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-p8 overflow-auto">
          <img alt={basename(filePath) ?? filePath} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
        </div>
      ) : editing ? (
        // Official b: textarea flex-1 min-h-0 w-full resize-none p-p6 font-mono text-code …
        <textarea
          className="flex-1 min-h-0 w-full resize-none p-p6 font-mono text-code text-t9 bg-transparent outline-none hide-focus-ring border-0 select-text whitespace-pre"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
              event.preventDefault();
              if (!saving && !draftUnchanged && !saveError) void saveEdit(editBaseHash);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              if (!saving) cancelEdit();
            }
          }}
          spellCheck={false}
          autoFocus
          aria-label="Edit file contents"
        />
      ) : markdownPreview ? (
        // Official S: data-file-viewer flex-1 overflow-y-auto select-text px-[24px] py-[16px] > max-w-[72ch] markdown
        <div data-file-viewer="" className="flex-1 min-h-0 overflow-y-auto select-text px-[24px] py-[16px]">
          <div className="max-w-[72ch]">
            <div className="epitaxy-markdown">
              <MarkdownContent text={state.text ?? ""} />
            </div>
          </div>
        </div>
      ) : isHtmlPreviewPath(filePath) && state.text !== undefined ? (
        <iframe className="flex-1 min-h-0 w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" srcDoc={state.text} title={basename(filePath) ?? filePath} />
      ) : (
        // Official: epitaxy-diff flex-1 min-h-0 (data-file-viewer) > eu scroll > iu File
        <div ref={fileBodyRef} className="epitaxy-diff flex-1 min-h-0" data-file-viewer="">
          {pierreFile ? (
            <div className="h-full overflow-y-auto select-text">
              <PierreFile
                key={`sidefile:${workerPool ? "ready" : "pending"}:${filePath}:${state.text?.length ?? 0}:${fileView.scrollNonce ?? 0}`}
                file={pierreFile}
                options={pierreOptions}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
