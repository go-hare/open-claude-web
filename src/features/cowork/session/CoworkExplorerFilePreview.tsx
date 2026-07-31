/**
 * Official Browse-files right pane: AZt → TZt({ filePath, sessionId, hideTaskLink: true })
 * (index-BELzQL5P.pretty.js ~246180).
 *
 * Load path matches Gzt: loadCoworkFileDetail → FileSystem.readLocalFile(sessionId,
 * encodeURIComponent(path)); image base64 → dataUrl; text → kzt-style body.
 * hideTaskLink: true — no task deep-link chrome in the explorer embed.
 */

import { useEffect, useMemo, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { CoworkButton } from "../ui/CoworkButton";
import {
  coworkFileBasename,
  coworkFileDisplayParts,
  formatCoworkFileCodeContent,
  resolveCoworkFileDisplay,
  stripCoworkComputerPrefix,
  type CoworkFileDetailContent,
  type CoworkFileDetailState,
} from "./coworkFileDetailModel";
import { loadCoworkFileDetail } from "./loadCoworkFileDetail";
import { CoworkMarkdownTree, parseCoworkMarkdown } from "./transcript/CoworkMarkdown";

export type CoworkExplorerOpenFileTarget = {
  content?: string;
  findQuery?: string;
  line?: number;
  path: string;
  title?: string;
  toolType?: string;
};

type CoworkExplorerFilePreviewProps = {
  /** Official hideTaskLink — explorer always true. */
  hideTaskLink?: boolean;
  onOpenFile?: (target: CoworkExplorerOpenFileTarget) => void;
  selectedPath: string | null;
  sessionId: string;
};

export function CoworkExplorerFilePreview({
  hideTaskLink = true,
  onOpenFile,
  selectedPath,
  sessionId,
}: CoworkExplorerFilePreviewProps) {
  const [state, setState] = useState<CoworkFileDetailState>({ isLoading: false });

  useEffect(() => {
    if (!selectedPath) {
      setState({ isLoading: false });
      return;
    }
    let alive = true;
    setState({ isLoading: true });
    void loadCoworkFileDetail(sessionId, selectedPath)
      .then((content) => {
        if (!alive) return;
        setState({ content, isLoading: false });
      })
      .catch((error) => {
        if (!alive) return;
        setState({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      });
    return () => {
      alive = false;
    };
  }, [selectedPath, sessionId]);

  const meta = useMemo(
    () => (selectedPath ? resolveCoworkFileDisplay(selectedPath) : null),
    [selectedPath],
  );
  const titleParts = useMemo(
    () => (selectedPath ? coworkFileDisplayParts(selectedPath) : null),
    [selectedPath],
  );

  if (!selectedPath) {
    return (
      <section
        className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-border-300 bg-bg-100 px-4 text-center text-sm text-text-500"
        data-official-source="index-BELzQL5P.js:AZt empty"
      >
        Select a file to preview it.
      </section>
    );
  }

  const onOpenLocal = () => {
    const localPath = stripCoworkComputerPrefix(selectedPath);
    if (onOpenFile) {
      onOpenFile({ path: selectedPath });
      return;
    }
    void desktopBridge.FileSystem.openLocalFile?.(sessionId, encodeURIComponent(localPath));
  };

  // hideTaskLink reserved for official task-link residual (explorer always true).
  void hideTaskLink;

  return (
    <section
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-300 bg-bg-100"
      data-official-source="index-BELzQL5P.js:AZt→TZt explorer embed"
    >
      <div className="flex items-center gap-2 border-b border-border-300 px-3 py-2">
        <Icon className="text-text-400" name="NoteSquareLines" size="xs" />
        <button
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text-100 hover:underline hover:underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
          onClick={onOpenLocal}
          title={selectedPath}
          type="button"
        >
          {titleParts?.displayName ?? coworkFileBasename(selectedPath)}
          {titleParts?.displayExt ? (
            <>
              <span className="text-text-400 opacity-50"> · </span>
              <span className="text-text-400">{titleParts.displayExt}</span>
            </>
          ) : null}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-bg-000">
        <CoworkExplorerPreviewBody
          error={state.error}
          fileName={coworkFileBasename(selectedPath)}
          isLoading={state.isLoading}
          meta={meta}
          onOpenLocal={onOpenLocal}
          onRetry={() => {
            setState({ isLoading: true });
            void loadCoworkFileDetail(sessionId, selectedPath)
              .then((content) => setState({ content, isLoading: false }))
              .catch((error) =>
                setState({
                  error: error instanceof Error ? error.message : String(error),
                  isLoading: false,
                }),
              );
          }}
          state={state}
          title={titleParts?.displayName ?? coworkFileBasename(selectedPath)}
        />
      </div>
    </section>
  );
}

function CoworkExplorerPreviewBody({
  error,
  fileName,
  isLoading,
  meta,
  onOpenLocal,
  onRetry,
  state,
  title,
}: {
  error?: string;
  fileName: string;
  isLoading: boolean;
  meta: ReturnType<typeof resolveCoworkFileDisplay> | null;
  onOpenLocal: () => void;
  onRetry: () => void;
  state: CoworkFileDetailState;
  title: string;
}) {
  // Official kzt → yzt
  if (isLoading && !state.content) {
    return (
      <div className="flex h-full items-center justify-center" data-official-source="index-BELzQL5P.js:yzt">
        <Icon className="animate-spin text-text-300" name="Spinner" size="md" />
      </div>
    );
  }
  // Official kzt → vzt
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-text-300 gap-4 px-4"
        data-official-source="index-BELzQL5P.js:vzt"
      >
        <div className="text-center text-sm">{error}</div>
        <div className="flex items-center gap-2">
          <button className="rounded-md bg-bg-300 px-3 py-1.5 text-sm text-text-100" onClick={onRetry} type="button">
            Try again
          </button>
          <CoworkButton onClick={onOpenLocal} variant="contained">
            Open file
          </CoworkButton>
        </div>
      </div>
    );
  }
  if (!meta) return null;
  // Official kzt → Czt
  if (meta.displayFileType === "nonrenderable") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-sm text-text-300">
        <div>No preview available</div>
        <CoworkButton onClick={onOpenLocal} variant="contained">
          Open file
        </CoworkButton>
      </div>
    );
  }
  if (state.content?.kind === "image") {
    return (
      <div className="h-full p-5" data-official-source="index-BELzQL5P.js:wzt image">
        <div className="flex items-center justify-center w-full h-full">
          <img
            alt={title}
            className="w-auto h-auto max-w-full max-h-full object-contain"
            src={state.content.dataUrl}
          />
        </div>
      </div>
    );
  }
  if (state.content === undefined) return null;
  const text = contentText(state.content);
  if (meta.isMarkdown) {
    const root = parseCoworkMarkdown(text);
    return (
      <div className="relative h-full" data-official-source="index-BELzQL5P.js:wzt markdown">
        <div className="absolute inset-0 overflow-auto">
          <div className="mx-auto w-full max-w-3xl leading-[1.65rem] py-4 pl-6 pr-6 md:py-6 md:pl-11 md:pr-11">
            <div className="font-claude-response epitaxy-markdown">
              <CoworkMarkdownTree profile="assistant" root={root} source={text} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (meta.isHtml) {
    return (
      <div className="relative h-full">
        <pre className="absolute inset-0 m-0 overflow-auto select-text p-4 font-mono text-[13px] leading-[18px] text-text-100 whitespace-pre-wrap">
          {text}
        </pre>
      </div>
    );
  }
  const codeText = formatCoworkFileCodeContent(text, meta.fileSyntax);
  return (
    <div className="relative h-full" data-official-source="index-BELzQL5P.js:wzt code">
      <pre
        className="absolute inset-0 m-0 overflow-auto select-text p-4 font-mono text-[13px] leading-[18px] text-text-100 whitespace-pre-wrap"
        data-file-name={fileName}
        data-file-syntax={meta.fileSyntax}
        tabIndex={0}
      >
        {codeText}
      </pre>
    </div>
  );
}

function contentText(content: CoworkFileDetailContent | undefined): string {
  return content?.kind === "text" ? content.text : "";
}
