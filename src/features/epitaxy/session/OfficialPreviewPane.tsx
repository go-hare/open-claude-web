/**
 * Official c119 preview side-pane (Views → Preview).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useEffect, useState } from "react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import { isHtmlPreviewPath, isPreviewImagePath, readPreviewText } from "./officialFilePreviewUtils";

export type OfficialPreviewTarget = {
  path: string;
  title?: string;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

export function OfficialPreviewPane({
  bridge,
  previewTarget,
  session,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  previewTarget: OfficialPreviewTarget | null;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
}) {
  const [selectedTarget, setSelectedTarget] = useState<OfficialPreviewTarget | null>(previewTarget);
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({ isLoading: false });

  useEffect(() => {
    setSelectedTarget(previewTarget);
  }, [previewTarget]);

  useEffect(() => {
    let alive = true;
    const target = selectedTarget;
    if (!target || !sessionRef) {
      setState({ isLoading: false });
      return () => {
        alive = false;
      };
    }
    setState({ isLoading: true });
    const load = isPreviewImagePath(target.path)
      ? bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, target.path).then((dataUrl) => ({ dataUrl: dataUrl ?? undefined }))
        : Promise.reject(new Error("Image preview is unavailable."))
      : readPreviewText(bridge, sessionRef.id, target.path).then((result) => ({
          text: result.text,
          unreadable: result.unreadable,
        }));
    void load
      .then((result) => {
        if (!alive) return;
        setState({ ...result, isLoading: false });
      })
      .catch((error) => {
        if (!alive) return;
        setState({ error: error instanceof Error ? error.message : String(error), isLoading: false });
      });
    return () => {
      alive = false;
    };
  }, [bridge, selectedTarget, sessionRef]);

  const pickFile = async () => {
    if (!sessionRef) return;
    const picked = (await bridge.pickFileAtCwd?.(sessionRef.id)) ?? (await bridge.pickSessionFile?.(sessionRef.id));
    if (picked) setSelectedTarget({ path: picked });
  };

  if (!selectedTarget) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g8 px-p8 text-center">
        <img alt="" className="select-none" draggable={false} height={94} src="/assets/v1/clawd-laptop-official.gif" width={140} />
        <div role="status" className="flex items-center gap-g3 text-body text-t7">
          <OfficialSpinner />
          <span>
            {session
              ? "Run your dev server to inspect network requests, debug with logs, and see changes live."
              : "Run your dev server to inspect network requests, debug with logs, and see changes live."}
          </span>
        </div>
        {sessionRef && (bridge.pickFileAtCwd || bridge.pickSessionFile) ? (
          <OfficialButton onClick={() => void pickFile()} variant="contained">
            Open preview file
          </OfficialButton>
        ) : null}
      </div>
    );
  }

  const title = selectedTarget.title ?? basename(selectedTarget.path) ?? selectedTarget.path;
  return (
    <div className="h-full min-w-0 flex flex-col bg-bg-000">
      <div className="flex items-center gap-g4 border-b border-border-300 px-p6 py-p4">
        <Icon name="NoteSquareLines" size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body text-t8">{title}</div>
          <div className="truncate text-caption text-t5">{selectedTarget.path}</div>
        </div>
        <OfficialButton ariaLabel="Copy path" icon="CopySquareBehind" onClick={() => void navigator.clipboard?.writeText(selectedTarget.path)} />
        {bridge.openInEditor ? (
          <OfficialButton ariaLabel="Open in editor" icon="Folder1Open" onClick={() => void bridge.openInEditor?.(selectedTarget.path)} />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {state.isLoading ? (
          <div role="status" className="h-full flex items-center justify-center text-t5">
            <OfficialSpinner />
            <span className="sr-only">Loading preview</span>
          </div>
        ) : state.error ? (
          <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">{state.error}</div>
        ) : state.dataUrl ? (
          <div className="flex min-h-full items-center justify-center p-p8">
            <img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
          </div>
        ) : isHtmlPreviewPath(selectedTarget.path) && state.text !== undefined ? (
          <iframe className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" srcDoc={state.text} title={title} />
        ) : (
          <pre className="m-0 min-w-max p-p8 text-code text-t8 leading-[18px] whitespace-pre-wrap">{state.text ?? ""}</pre>
        )}
      </div>
    </div>
  );
}
