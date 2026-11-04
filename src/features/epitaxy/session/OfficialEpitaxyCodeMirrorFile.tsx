/**
 * Official cbd02 `EpitaxyCodeMirrorFile` (`$a`) / cd2ef `fi`.
 * Host: `relative flex-1 min-h-0 h-full` > `data-file-viewer` `h-full overflow-hidden text-code [&_.cm-editor]:h-full`.
 * cbd02 extras: columnSelection `ia` / detectIndentation `ta` / Ctrl-g `Ee` / comments context.
 */
import { indentWithTab, toggleComment } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldedRanges,
  indentUnit,
  LanguageDescription,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { Compartment, EditorSelection, EditorState, Prec, type Extension, type Transaction } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  EditorView,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
} from "@codemirror/view";
import { useEffect, useRef } from "react";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  ContextMenu,
} from "../../../shell/BaseMenu";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { SIDE_PANE_CHROME_MESSAGES } from "../officialCodeChromeMessages";

export const AUTO_SAVE_DELAY_MS = 1000;

const DETECT_INDENT_LINE_CAP = 10_000;
const DETECT_INDENT_MIN = 2;
const DETECT_INDENT_MAX = 8;
const DETECT_INDENT_LEAD = /^[ \t]*/;
const DEFAULT_INDENT_UNIT = "  ";
const GO_TO_LINE_RE = /^(\d+)\s*(?::\s*(\d*))?$/;

/** Official cd2ef `oo` — parse `so` Go to line as line or line:column. */
export function officialParseGoToLine(value: string) {
  const match = GO_TO_LINE_RE.exec(value.trim());
  if (match === null) return null;
  return { line: Number(match[1]), column: match[2] ? Number(match[2]) : undefined };
}

/** Official cbd02 `Ft` / `$i` — indent from first indented lines, else two spaces. */
export function officialCbd02DetectIndent(doc: string): string {
  let tabs = 0;
  let spaces = 0;
  const counts = new Map<number, number>();
  let prev = 0;
  let seen = 0;
  for (const line of doc.split("\n")) {
    if (++seen > DETECT_INDENT_LINE_CAP) break;
    const lead = DETECT_INDENT_LEAD.exec(line)?.[0] ?? "";
    if (lead.length === line.length) continue;
    if (lead.startsWith("\t")) tabs += 1;
    else if (!lead.includes("\t")) {
      const width = lead.length;
      spaces += +(width >= DETECT_INDENT_MIN);
      const delta = width - prev;
      if (delta >= DETECT_INDENT_MIN && delta <= DETECT_INDENT_MAX && prev % delta === 0) {
        counts.set(delta, (counts.get(delta) ?? 0) + 1);
      }
      prev = width;
    }
  }
  if (tabs > spaces) return "\t";
  let best = 0;
  let bestCount = 0;
  for (const [size, count] of counts) {
    if (count > bestCount || (count === bestCount && size < best)) {
      best = size;
      bestCount = count;
    }
  }
  for (let size = DETECT_INDENT_MIN; size < best; size += 1) {
    if (best % size === 0 && (counts.get(size) ?? 0) * 2 >= bestCount) return " ".repeat(size);
  }
  return best === 0 ? DEFAULT_INDENT_UNIT : " ".repeat(best);
}

/** Official cbd02 `ra` — drop pointer multi-ranges that sit inside a fold. */
function officialCbd02ColumnSelectionFilter(tr: Transaction) {
  const { selection } = tr;
  if (!selection || selection.ranges.length < 2 || tr.docChanged || !tr.isUserEvent("select.pointer")) return tr;
  const folds = foldedRanges(tr.startState);
  const kept = selection.ranges.filter((range) => {
    const line = tr.startState.doc.lineAt(range.from);
    if (range.to > line.to) return true;
    let hit = false;
    folds.between(line.from, line.to, (from, to) => {
      const coversLine = from < line.from && to >= line.to;
      hit ||= coversLine || (from < range.to && to > range.from);
    });
    return !hit;
  });
  if (kept.length === 0 || kept.length === selection.ranges.length) return tr;
  return [
    tr,
    {
      selection: EditorSelection.create(
        kept,
        Math.max(0, kept.indexOf(selection.main)),
      ),
    },
  ];
}

/** Official cbd02 `ia(fe)` — rectangularSelection + pointer multi-range filter. */
export function officialCbd02ColumnSelection(enabled: boolean): Extension {
  if (!enabled) return [];
  return [rectangularSelection(), EditorState.transactionFilter.of(officialCbd02ColumnSelectionFilter)];
}

export type OfficialEpitaxyCodeMirrorFileProps = {
  autoSave?: boolean;
  contents: string;
  filePath: string;
  autoCloseBrackets?: boolean;
  codeFolding?: boolean;
  columnSelection?: boolean;
  detectIndentation?: boolean;
  findHighlight?: string;
  indentGuides?: boolean;
  column?: number;
  line?: number;
  onAddComment?: (range: { fromLine: number; text: string; toLine: number }) => void;
  onChange?: (value: string) => void;
  onDiscard?: () => void;
  onEscape?: () => void;
  onGoToLine?: () => boolean;
  onSave?: () => void;
  readOnly?: boolean;
  scrollNonce?: number;
  scrollPastEnd?: boolean;
  showWhitespace?: boolean;
  tabIndents?: boolean;
  tabSize?: number;
  wordWrap?: boolean;
};

export function officialFiExtras(input: {
  autoCloseBrackets: boolean;
  codeFolding: boolean;
  indentGuides: boolean;
  scrollPastEnd: boolean;
  showWhitespace: boolean;
}) {
  return [
    ...(input.codeFolding ? [foldGutter(), bracketMatching()] : [bracketMatching()]),
    ...(input.autoCloseBrackets ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : []),
    ...(input.indentGuides
      ? [
          EditorView.theme({
            ".cm-line": {
              boxShadow: "inset 1px 0 0 color-mix(in srgb, currentColor 12%, transparent)",
              backgroundImage:
                "repeating-linear-gradient(to right, transparent 0, transparent calc(1ch * var(--cm-tab-size, 4) - 1px), color-mix(in srgb, currentColor 10%, transparent) calc(1ch * var(--cm-tab-size, 4) - 1px), color-mix(in srgb, currentColor 10%, transparent) calc(1ch * var(--cm-tab-size, 4)))",
            },
          }),
        ]
      : []),
    ...(input.scrollPastEnd ? [EditorView.scrollMargins.of(() => ({ bottom: 240, top: 0, left: 0, right: 0 }))] : []),
    ...(input.showWhitespace ? [highlightSpecialChars()] : []),
  ];
}

function languageFromPath(filePath: string) {
  const name = filePath.split(/[\\/]/).pop() ?? filePath;
  return LanguageDescription.matchFilename(languages, name);
}

export function OfficialEpitaxyCodeMirrorFile({
  autoCloseBrackets = true,
  autoSave = false,
  codeFolding = true,
  column = undefined,
  columnSelection = true,
  contents,
  detectIndentation = true,
  filePath,
  findHighlight,
  indentGuides = true,
  line,
  onAddComment,
  onChange,
  onDiscard,
  onEscape,
  onGoToLine,
  onSave,
  readOnly = false,
  scrollNonce,
  scrollPastEnd = false,
  showWhitespace = false,
  tabIndents = false,
  tabSize = 4,
  wordWrap = true,
}: OfficialEpitaxyCodeMirrorFileProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const wrapCompartment = useRef(new Compartment());
  const readCompartment = useRef(new Compartment());
  const tabCompartment = useRef(new Compartment());
  const indentCompartment = useRef(new Compartment());
  const extrasCompartment = useRef(new Compartment());
  const columnCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onDiscardRef = useRef(onDiscard);
  const onEscapeRef = useRef(onEscape);
  const onGoToLineRef = useRef(onGoToLine);
  const autoSaveRef = useRef(autoSave);
  const chromeText = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const saveTimer = useRef<number | null>(null);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  onDiscardRef.current = onDiscard;
  onEscapeRef.current = onEscape;
  onGoToLineRef.current = onGoToLine;
  autoSaveRef.current = autoSave;

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent) return;
    const dark = document.documentElement.classList.contains("dark")
      || document.documentElement.dataset.theme === "dark"
      || window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const indent = detectIndentation ? officialCbd02DetectIndent(contents) : DEFAULT_INDENT_UNIT;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: contents,
        extensions: [
          EditorState.allowMultipleSelections.of(true),
          lineNumbers(),
          highlightSelectionMatches(),
          keymap.of([
            {
              key: "Ctrl-g",
              run: () => onGoToLineRef.current?.() === true,
            },
            {
              key: "Mod-s",
              run: () => {
                onSaveRef.current?.();
                return true;
              },
            },
            {
              key: "Escape",
              run: () => {
                onEscapeRef.current?.();
                return true;
              },
            },
            {
              key: "Mod-Escape",
              run: () => {
                onDiscardRef.current?.();
                return true;
              },
            },
            ...(tabIndents && !readOnly ? [indentWithTab] : []),
          ]),
          Prec.high(keymap.of([{ key: "Mod-/", run: toggleComment }])),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const next = update.state.doc.toString();
            onChangeRef.current?.(next);
            if (!autoSaveRef.current || readOnly) return;
            if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
            saveTimer.current = window.setTimeout(() => {
              onSaveRef.current?.();
            }, AUTO_SAVE_DELAY_MS);
          }),
          EditorView.contentAttributes.of({ "aria-label": "File contents" }),
          placeholder(""),
          langCompartment.current.of([]),
          wrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
          readCompartment.current.of(readOnly ? EditorState.readOnly.of(true) : []),
          tabCompartment.current.of(EditorState.tabSize.of(tabSize)),
          indentCompartment.current.of(indentUnit.of(indent)),
          extrasCompartment.current.of(officialFiExtras({ autoCloseBrackets, codeFolding, indentGuides, scrollPastEnd, showWhitespace })),
          columnCompartment.current.of(officialCbd02ColumnSelection(columnSelection)),
          ...(dark ? [oneDark] : []),
        ],
      }),
    });
    viewRef.current = view;
    const desc = languageFromPath(filePath);
    if (desc) {
      void desc.load().then((support) => {
        if (viewRef.current === view) {
          view.dispatch({ effects: langCompartment.current.reconfigure(support) });
        }
      });
    }
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
      view.destroy();
      if (viewRef.current === view) viewRef.current = null;
    };
    // Mount once; compartments handle later option changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== contents) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: contents },
      });
    }
  }, [contents]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const indent = detectIndentation
      ? officialCbd02DetectIndent(view.state.doc.toString())
      : DEFAULT_INDENT_UNIT;
    view.dispatch({
      effects: [
        wrapCompartment.current.reconfigure(wordWrap ? EditorView.lineWrapping : []),
        readCompartment.current.reconfigure(readOnly ? EditorState.readOnly.of(true) : []),
        tabCompartment.current.reconfigure(EditorState.tabSize.of(tabSize)),
        indentCompartment.current.reconfigure(indentUnit.of(indent)),
        extrasCompartment.current.reconfigure(
          officialFiExtras({ autoCloseBrackets, codeFolding, indentGuides, scrollPastEnd, showWhitespace }),
        ),
        columnCompartment.current.reconfigure(officialCbd02ColumnSelection(columnSelection)),
      ],
    });
  }, [autoCloseBrackets, codeFolding, columnSelection, detectIndentation, indentGuides, readOnly, scrollPastEnd, showWhitespace, tabSize, wordWrap]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || line == null || line < 1) return;
    const docLine = view.state.doc.line(Math.min(line, view.state.doc.lines));
    const col = column != null && column > 0 ? Math.min(column - 1, docLine.length) : 0;
    view.dispatch({
      selection: { anchor: docLine.from + col },
      scrollIntoView: true,
    });
  }, [column, filePath, line, scrollNonce]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !findHighlight) return;
    const needle = findHighlight.toLowerCase();
    const text = view.state.doc.toString().toLowerCase();
    const at = text.indexOf(needle);
    if (at < 0) return;
    view.dispatch({
      selection: { anchor: at, head: at + findHighlight.length },
      scrollIntoView: true,
    });
  }, [findHighlight, scrollNonce]);

  const commentRange = () => {
    const view = viewRef.current;
    if (!view) return null;
    const range = view.state.selection.main;
    const fromLine = view.state.doc.lineAt(range.from).number;
    const toLine = view.state.doc.lineAt(range.to).number;
    const from = Math.min(range.from, range.to);
    const to = Math.max(range.from, range.to);
    return { fromLine, text: view.state.doc.sliceString(from, to), toLine };
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => (
          <div className="relative flex-1 min-h-0 h-full" {...props}>
            <div
              ref={hostRef}
              className="h-full overflow-hidden text-code [&_.cm-editor]:h-full"
              data-file-viewer=""
            />
          </div>
        )}
      />
      <BaseContextMenuPopup>
        <BaseContextMenuItem
          onClick={() => {
            onGoToLine?.();
          }}
        >
          {chromeText.goToLine}
        </BaseContextMenuItem>
        {onAddComment ? (
          <BaseContextMenuItem
            onClick={() => {
              const range = commentRange();
              if (range) onAddComment(range);
            }}
          >
            {chromeText.addComment}
          </BaseContextMenuItem>
        ) : null}
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}
