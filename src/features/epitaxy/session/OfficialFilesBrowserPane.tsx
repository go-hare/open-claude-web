/**
 * Official XC Files browser pane (c11959232).
 * Tree via fe.listSessionDirectory; fuzzy via Le.fetchMentionOptions; content via Le.searchFileContents (?query).
 * Click file → setFileView + setSidePane("file") (host openFile).
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { desktopBridge, type LocalSessionsBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton, type OfficialSessionRef } from "../OfficialEpitaxyComponents";

/** Local mini spinner — OfficialSparkSpinner lives in EpitaxySessionTile; keep XC independent. */
function FilesPaneSpinner({ size = "s" }: { size?: "s" | "m" | "l" }) {
  const box = size === "s" ? 12 : size === "l" ? 20 : 16;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent"
      style={{
        width: box,
        height: box,
        borderColor: "var(--text-500, currentColor)",
        borderTopColor: "transparent",
      }}
    />
  );
}

export type OfficialBrowserFileEntry = {
  absPath: string;
  isDirectory: boolean;
  name: string;
  positions?: number[];
  relativePath: string;
};

type ContentMatch = {
  line?: number;
  preview?: string;
};

type ContentGroup = {
  entry: OfficialBrowserFileEntry;
  matches: ContentMatch[];
};

function relativeToRoot(absPath: string, root: string): string {
  const normalizedRoot = root.replace(/\/+$/, "");
  if (!normalizedRoot) return absPath;
  if (absPath === normalizedRoot) return "";
  if (absPath.startsWith(`${normalizedRoot}/`)) return absPath.slice(normalizedRoot.length + 1);
  return absPath;
}

function sortEntries(a: OfficialBrowserFileEntry, b: OfficialBrowserFileEntry) {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function parseMentionFile(
  item: { id?: string; label?: string; metadata?: string | Record<string, unknown> },
  root: string,
): OfficialBrowserFileEntry | null {
  // Official QC: id must start with "file-"; desktop may still emit bare abs paths.
  let absPath: string | null = null;
  if (item.id?.startsWith("file-")) absPath = item.id.slice(5);
  else if (item.id?.startsWith("/")) absPath = item.id;
  else return null;
  let relativePath = relativeToRoot(absPath, root);
  let isDirectory = false;
  let positions: number[] | undefined;
  if (item.metadata) {
    try {
      const meta = (typeof item.metadata === "string"
        ? JSON.parse(item.metadata)
        : item.metadata) as {
        isDirectory?: boolean;
        path?: string;
        positions?: number[];
      };
      if (meta.path) {
        // metadata.path may be abs (desktop) or relative (official).
        relativePath = meta.path.startsWith("/")
          ? relativeToRoot(meta.path, root)
          : meta.path;
      }
      if (typeof meta.isDirectory === "boolean") isDirectory = meta.isDirectory;
      if (Array.isArray(meta.positions)) positions = meta.positions;
    } catch {
      // ignore bad metadata
    }
  }
  const slash = relativePath.lastIndexOf("/");
  return {
    name: slash >= 0 ? relativePath.slice(slash + 1) : (item.label ?? relativePath),
    absPath,
    relativePath,
    isDirectory,
    positions,
  };
}

function HighlightText({ text, positions, offset }: { offset: number; positions?: number[]; text: string }) {
  if (!positions?.length) return <>{text}</>;
  const nodes: React.ReactNode[] = [];
  let posIdx = 0;
  while (posIdx < positions.length && positions[posIdx]! < offset) posIdx += 1;
  let i = 0;
  while (i < text.length) {
    if (posIdx < positions.length && positions[posIdx] === i + offset) {
      const start = i;
      while (posIdx < positions.length && positions[posIdx] === i + offset) {
        i += 1;
        posIdx += 1;
      }
      nodes.push(
        <span className="font-semibold text-t9" key={start}>{text.slice(start, i)}</span>,
      );
    } else {
      const start = i;
      while (i < text.length && (posIdx >= positions.length || positions[posIdx] !== i + offset)) i += 1;
      nodes.push(text.slice(start, i));
    }
  }
  return <>{nodes}</>;
}

function TreeEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-p6 py-p4 text-footnote text-t6">{children}</div>
  );
}

function FileTreeRow({
  depth,
  entry,
  expanded,
  onDrillInto,
  onPreview,
  onToggle,
  showPath,
}: {
  depth: number;
  entry: OfficialBrowserFileEntry;
  expanded?: boolean;
  onDrillInto?: (relativePath: string) => void;
  onPreview: (absPath: string, line?: number, findQuery?: string) => void;
  onToggle?: (absPath: string) => void;
  showPath?: boolean;
}) {
  const slash = entry.relativePath.lastIndexOf("/");
  const parentPath = showPath && slash > 0 ? entry.relativePath.slice(0, slash) : "";
  const onPrimary = () => {
    if (entry.isDirectory) {
      if (onToggle) onToggle(entry.absPath);
      else onDrillInto?.(entry.relativePath);
      return;
    }
    onPreview(entry.absPath);
  };
  const iconName = entry.isDirectory
    ? onToggle
      ? (expanded ? "ChevronDownSmall" : "ChevronRightSmall")
      : "Folder1"
    : "代码";
  return (
    <div
      aria-expanded={entry.isDirectory ? expanded : undefined}
      aria-level={depth + 1}
      className="group w-full outline-none ring-focus rounded-r2 flex items-center"
      data-tree-row
      role="treeitem"
      style={{ paddingLeft: 16 * depth + 8 }}
      tabIndex={-1}
    >
      <button
        className="flex flex-1 min-w-0 items-baseline gap-g5 text-left bg-transparent border-0 outline-none hide-focus-ring rounded-r2 py-p2"
        data-tree-primary
        onClick={onPrimary}
        tabIndex={-1}
        type="button"
      >
        <span className="flex items-center justify-center size-[14px] shrink-0 text-t6">
          <Icon name={iconName} size="sm" />
        </span>
        <span className="truncate text-t8">
          <HighlightText offset={slash + 1} positions={entry.positions} text={entry.name} />
        </span>
        {showPath && parentPath ? (
          <span className="truncate text-footnote text-t6">
            <HighlightText offset={0} positions={entry.positions} text={parentPath} />
          </span>
        ) : null}
      </button>
    </div>
  );
}

function DirectoryBranch({
  absPath,
  depth,
  onPreview,
  root,
  sessionId,
}: {
  absPath: string;
  depth: number;
  onPreview: (absPath: string, line?: number, findQuery?: string) => void;
  root: string;
  sessionId: string;
}) {
  const bridge = desktopBridge.LocalSessions;
  const [expanded, setExpanded] = useState(() => new Set<string>());
  const [entries, setEntries] = useState<OfficialBrowserFileEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const raw = await bridge.listSessionDirectory?.(sessionId, absPath) ?? [];
        if (!alive) return;
        const next = raw
          .map((item) => ({
            name: item.name,
            absPath: item.path,
            relativePath: relativeToRoot(item.path, root),
            isDirectory: Boolean(item.isDirectory),
          }))
          .sort(sortEntries);
        setEntries(next);
      } catch {
        if (alive) {
          setError(true);
          setEntries([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [absPath, bridge, root, sessionId]);

  const toggle = useCallback((path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (loading && depth === 0) {
    return <TreeEmpty><FilesPaneSpinner size="s" /></TreeEmpty>;
  }
  if (error) {
    return depth === 0 ? <TreeEmpty>Couldn't read this folder.</TreeEmpty> : null;
  }
  if (!entries || entries.length === 0) {
    return depth === 0 ? <TreeEmpty>Folder is empty</TreeEmpty> : null;
  }

  return (
    <>
      {entries.map((entry) => {
        const isOpen = expanded.has(entry.absPath);
        return (
          <div key={entry.absPath}>
            <FileTreeRow
              depth={depth}
              entry={entry}
              expanded={entry.isDirectory ? isOpen : undefined}
              onPreview={onPreview}
              onToggle={entry.isDirectory ? toggle : undefined}
            />
            {entry.isDirectory && isOpen ? (
              <DirectoryBranch
                absPath={entry.absPath}
                depth={depth + 1}
                onPreview={onPreview}
                root={root}
                sessionId={sessionId}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function FuzzyResults({
  isFetching,
  onDrillInto,
  onPreview,
  results,
}: {
  isFetching: boolean;
  onDrillInto: (relativePath: string) => void;
  onPreview: (absPath: string, line?: number, findQuery?: string) => void;
  results: OfficialBrowserFileEntry[];
}) {
  if (results.length === 0) {
    return isFetching ? null : <TreeEmpty>No matching files</TreeEmpty>;
  }
  return (
    <>
      {results.map((entry) => (
        <FileTreeRow
          depth={0}
          entry={entry}
          key={entry.absPath}
          onDrillInto={onDrillInto}
          onPreview={onPreview}
          showPath
        />
      ))}
    </>
  );
}

function ContentResults({
  findQuery,
  groups,
  hasQuery,
  isFetching,
  onPreview,
}: {
  findQuery: string;
  groups: ContentGroup[];
  hasQuery: boolean;
  isFetching: boolean;
  onPreview: (absPath: string, line?: number, findQuery?: string) => void;
}) {
  if (!hasQuery) return <TreeEmpty>Type after ? to search file contents</TreeEmpty>;
  if (groups.length === 0) {
    return isFetching ? null : <TreeEmpty>No matching files</TreeEmpty>;
  }
  return (
    <>
      {groups.map((group) => (
        <div className="flex flex-col" key={group.entry.absPath}>
          <FileTreeRow depth={0} entry={group.entry} onPreview={onPreview} showPath />
          {group.matches.slice(0, 5).map((match, index) => (
            <button
              className="text-left px-p8 py-p1 text-footnote text-t6 hover:text-t8 truncate outline-none hide-focus-ring"
              key={`${group.entry.absPath}-${match.line ?? index}`}
              onClick={() => onPreview(group.entry.absPath, match.line, findQuery)}
              type="button"
            >
              {match.line != null ? <span className="text-t5 mr-g3">{match.line}</span> : null}
              <span className="truncate">{match.preview?.trim() || "…"}</span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

/**
 * Official XC Files browser.
 */
export function OfficialFilesBrowserPane({
  onOpenFile,
  session,
  sessionRef,
}: {
  onOpenFile: (target: { findQuery?: string; line?: number; path: string }) => void;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
}) {
  const root = session?.repo?.name
    ? (session.cwd ?? "")
    : (session?.cwd ?? "");
  // Prefer worktree-aware cwd if present on session patches.
  const cwd = (session as SessionSummary & { worktreePath?: string })?.worktreePath
    ?? session?.cwd
    ?? "";
  const treeRoot = cwd || root;
  const [filter, setFilter] = useState("");
  const treeRef = useRef<HTMLDivElement | null>(null);
  const resources = desktopBridge.Resources;
  const canSearchContents = Boolean(resources?.searchFileContents);
  const trimmed = filter.trim();
  const isContentSearch = canSearchContents && trimmed.startsWith("?");
  const debounced = useDebouncedValue(trimmed, isContentSearch ? 250 : 120);
  const contentQuery = isContentSearch && debounced.startsWith("?")
    ? debounced.slice(1).trimStart()
    : "";
  const isFuzzy = !isContentSearch && debounced.length > 0 && !debounced.startsWith("?");
  const [fuzzyResults, setFuzzyResults] = useState<OfficialBrowserFileEntry[]>([]);
  const [contentGroups, setContentGroups] = useState<ContentGroup[]>([]);
  const [fuzzyFetching, setFuzzyFetching] = useState(false);
  const [contentFetching, setContentFetching] = useState(false);

  useEffect(() => {
    if (treeRoot) void resources?.setFocusedCwd?.(treeRoot);
  }, [resources, treeRoot]);

  useEffect(() => {
    if (!isFuzzy || !treeRoot) {
      setFuzzyResults([]);
      setFuzzyFetching(false);
      return;
    }
    let alive = true;
    setFuzzyFetching(true);
    void (async () => {
      try {
        const mentions = await resources?.fetchMentionOptions?.(debounced, "files") ?? [];
        if (!alive) return;
        const next: OfficialBrowserFileEntry[] = [];
        for (const item of mentions) {
          const parsed = parseMentionFile(item, treeRoot);
          if (parsed) next.push(parsed);
        }
        setFuzzyResults(next);
      } catch {
        if (alive) setFuzzyResults([]);
      } finally {
        if (alive) setFuzzyFetching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced, isFuzzy, resources, treeRoot]);

  useEffect(() => {
    if (!isContentSearch || !contentQuery || !treeRoot) {
      setContentGroups([]);
      setContentFetching(false);
      return;
    }
    let alive = true;
    setContentFetching(true);
    void (async () => {
      try {
        const hits = await resources?.searchFileContents?.(contentQuery, 200) ?? [];
        if (!alive) return;
        const byPath = new Map<string, ContentGroup>();
        for (const hit of hits) {
          const abs = hit.absPath ?? "";
          const rel = hit.relativePath ?? relativeToRoot(abs, treeRoot);
          if (!abs && !rel) continue;
          const key = rel || abs;
          const slash = key.lastIndexOf("/");
          const name = slash >= 0 ? key.slice(slash + 1) : key;
          const existing = byPath.get(key);
          const match: ContentMatch = { line: hit.line, preview: hit.preview };
          if (existing) {
            existing.matches.push(match);
          } else {
            byPath.set(key, {
              entry: {
                name,
                absPath: abs || key,
                relativePath: rel || key,
                isDirectory: false,
              },
              matches: [match],
            });
          }
        }
        setContentGroups([...byPath.values()]);
      } catch {
        if (alive) setContentGroups([]);
      } finally {
        if (alive) setContentFetching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [contentQuery, isContentSearch, resources, treeRoot]);

  const onPreview = useCallback((absPath: string, line?: number, findQuery?: string) => {
    onOpenFile({ path: absPath, line, findQuery });
  }, [onOpenFile]);

  const onDrillInto = useCallback((relativePath: string) => {
    setFilter(`${relativePath}/`);
    treeRef.current?.focus();
  }, []);

  const onTreeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rootEl = treeRef.current;
    if (!rootEl) return;
    const rows = Array.from(rootEl.querySelectorAll<HTMLElement>("[data-tree-row]"));
    if (rows.length === 0) return;
    const active = document.activeElement;
    const index = rows.findIndex((row) => row === active || row.contains(active));
    const focusAt = (next: number) => {
      const row = rows[next];
      if (!row) return;
      row.focus();
      row.scrollIntoView({ block: "nearest" });
    };
    const activate = (row: HTMLElement) => {
      row.querySelector<HTMLElement>("[data-tree-primary]")?.click();
    };
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index < 0 ? 0 : Math.min(index + 1, rows.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index <= 0 ? 0 : index - 1);
        return;
      case "Home":
        event.preventDefault();
        focusAt(0);
        return;
      case "End":
        event.preventDefault();
        focusAt(rows.length - 1);
        return;
      case "Enter":
      case " ":
        if (index < 0) return;
        event.preventDefault();
        activate(rows[index]!);
        return;
      case "ArrowRight":
        if (index < 0) return;
        event.preventDefault();
        if (rows[index]!.getAttribute("aria-expanded") === "false") activate(rows[index]!);
        else focusAt(Math.min(index + 1, rows.length - 1));
        return;
      case "ArrowLeft": {
        if (index < 0) return;
        event.preventDefault();
        const row = rows[index]!;
        if (row.getAttribute("aria-expanded") === "true") {
          activate(row);
          return;
        }
        const level = Number(row.getAttribute("aria-level") ?? "1");
        for (let i = index - 1; i >= 0; i -= 1) {
          if (Number(rows[i]!.getAttribute("aria-level") ?? "1") < level) {
            focusAt(i);
            return;
          }
        }
        return;
      }
      default:
        return;
    }
  }, []);

  const fetching = (isFuzzy && fuzzyFetching) || (isContentSearch && contentFetching);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-g4 h-h5 mx-[var(--p6)] my-[2px] px-p6 rounded-r5 bg-fill-contained-default effect-contained-default shrink-0">
        <Icon name="搜索" className="text-t6 shrink-0" size="sm" />
        <input
          aria-label="Filter files"
          autoComplete="off"
          autoFocus
          className="flex-1 min-w-0 bg-transparent border-0 outline-none hide-focus-ring text-body text-t8 placeholder:text-t6"
          onChange={(event) => setFilter(event.target.value)}
          placeholder={canSearchContents ? "Filter files… (?text to search contents)" : "Filter files…"}
          spellCheck={false}
          value={filter}
        />
        {fetching ? <FilesPaneSpinner size="s" /> : null}
        {filter ? (
          <OfficialButton
            ariaLabel="Clear filter"
            icon="XCrossCloseMedium"
            onClick={() => setFilter("")}
            size="small"
          />
        ) : null}
      </div>
      <div
        aria-label="Project files"
        className="flex-1 min-h-0 overflow-y-auto px-p3 py-p4 outline-none hide-focus-ring"
        onKeyDown={onTreeKeyDown}
        ref={treeRef}
        role="tree"
        tabIndex={0}
      >
        {!treeRoot ? (
          <TreeEmpty>No working directory for this session.</TreeEmpty>
        ) : isContentSearch ? (
          <ContentResults
            findQuery={contentQuery}
            groups={contentGroups}
            hasQuery={contentQuery.length > 0}
            isFetching={contentFetching}
            onPreview={onPreview}
          />
        ) : isFuzzy ? (
          <FuzzyResults
            isFetching={fuzzyFetching}
            onDrillInto={onDrillInto}
            onPreview={onPreview}
            results={fuzzyResults}
          />
        ) : (
          <DirectoryBranch
            absPath={treeRoot}
            depth={0}
            onPreview={onPreview}
            root={treeRoot}
            sessionId={sessionRef.id}
          />
        )}
      </div>
    </div>
  );
}

/** Official VC() — enable Files menu when listSessionDirectory + fetchMentionOptions exist. */
export function canUseOfficialFilesBrowser(bridge: LocalSessionsBridge = desktopBridge.LocalSessions): boolean {
  return Boolean(bridge.listSessionDirectory && desktopBridge.Resources?.fetchMentionOptions);
}
