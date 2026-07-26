/**
 * Official c11959232 Preview side-pane residual (Views → Preview / TI + cS + RS).
 *
 * Empty / error feed (cS EpitaxyLaunchActivityFeed):
 * - startError.kind === "no-config":
 *     text t2lqMIHmDm + primary Set up (rrGMSxQd9S) → submitToChat detect prompt
 * - startError.kind === "start-failed":
 *     text KES/W9o+Og + footnote ggso9In8a4
 * - no startError (loading / starting): WalkingClawd + spinner + "Setting up preview"
 *
 * Config source is Launch.getConfiguredServices(cwd) → official .claude/launch.json
 * only (fm residual). Missing config is no-config, not package.json invent.
 */
import { useCallback, useContext, useEffect, useState } from "react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import { isHtmlPreviewPath, isPreviewImagePath, readPreviewText } from "./officialFilePreviewUtils";

export type OfficialPreviewTarget = {
  path: string;
  title?: string;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

type LaunchStartError =
  | { kind: "no-config" }
  | { kind: "start-failed"; message?: string };

/** Official Set up → submitToChat residual (c11959232). */
export const OFFICIAL_PREVIEW_SETUP_PROMPT = `Detect my project's dev servers and save all their configurations to .claude/launch.json, then ask which ones to start.

\`\`\`json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "<server-name>",
      "runtimeExecutable": "<command>",
      "runtimeArgs": ["<args>"],
      "port": <port>
    }
  ]
}
\`\`\`

Use runtimeExecutable for the command (e.g. "yarn", "npm", "node", "python") and runtimeArgs for its arguments. Call preview_start for each server the user wants to run.`;

type LaunchBridge = {
  getConfiguredServices?: (cwd: string) => Promise<Array<{ name: string; port?: number }> | null | undefined>;
  startFromConfig?: (
    cwd: string,
    name?: string,
  ) => Promise<{ serverId?: string; error?: string } | null | undefined>;
  getPreviewUrl?: (serverId?: string) => Promise<string | null | undefined>;
  isAvailable?: () => boolean | Promise<boolean>;
};

function launchBridge(): LaunchBridge | null {
  const web = (window as Window & { "claude.web"?: { Launch?: LaunchBridge } })["claude.web"];
  return web?.Launch ?? null;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

/**
 * Official cS empty/error residual — no file-picker invent, no spinner on no-config.
 */
function OfficialLaunchActivityFeed({
  startError,
  onSetup,
  loadingLabel,
}: {
  startError: LaunchStartError | null;
  onSetup?: () => void;
  loadingLabel?: string | null;
}) {
  if (startError) {
    return (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-g6 px-p8 text-center">
        <p className="text-body text-t7 max-w-[36ch]">
          {startError.kind === "no-config"
            ? "Run your dev server to inspect network requests, debug with logs, and see changes live."
            : "Dev server failed to start."}
        </p>
        {startError.kind === "no-config" && onSetup ? (
          <OfficialButton onClick={onSetup} variant="contained">
            Set up
          </OfficialButton>
        ) : null}
        {startError.kind === "start-failed" ? (
          <p className="text-footnote text-t5">Error details were sent to Claude.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-g8 px-p8">
      <img
        alt=""
        className="select-none"
        draggable={false}
        height={94}
        src="/assets/v1/clawd-laptop-official.gif"
        width={140}
      />
      <div role="status" className="flex items-center gap-g3 text-body text-t7">
        <OfficialSpinner />
        <span>{loadingLabel ?? "Setting up preview"}</span>
      </div>
    </div>
  );
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
  const actions = useContext(EpitaxyTranscriptActionContext);
  const [selectedTarget, setSelectedTarget] = useState<OfficialPreviewTarget | null>(previewTarget);
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({
    isLoading: false,
  });
  const [startError, setStartError] = useState<LaunchStartError | null>(null);
  const [probeDone, setProbeDone] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTarget(previewTarget);
  }, [previewTarget]);

  // Official TI auto-start residual: getConfiguredServices(cwd) → empty ⇒ no-config;
  // first service ⇒ startFromConfig; failure ⇒ start-failed.
  useEffect(() => {
    let alive = true;
    const cwd = session?.cwd;
    if (!sessionRef || sessionRef.type !== "local" || !cwd) {
      setStartError({ kind: "no-config" });
      setProbeDone(true);
      setPreviewUrl(null);
      return () => {
        alive = false;
      };
    }
    setProbeDone(false);
    setStartError(null);
    setPreviewUrl(null);
    void (async () => {
      const launch = launchBridge();
      try {
        const services = (await launch?.getConfiguredServices?.(cwd)) ?? [];
        if (!alive) return;
        if (!services.length) {
          setStartError({ kind: "no-config" });
          setProbeDone(true);
          return;
        }
        const name = services[0]?.name;
        const started = await launch?.startFromConfig?.(cwd, name);
        if (!alive) return;
        if (started?.serverId) {
          const url = (await launch?.getPreviewUrl?.(started.serverId)) ?? null;
          if (!alive) return;
          setPreviewUrl(url);
          setStartError(null);
        } else if (started?.error) {
          setStartError({ kind: "start-failed", message: started.error });
          // Official: Error details were sent to Claude — forward message when submit available.
          if (started.error) {
            void actions?.submitToChat?.(
              `Preview dev server failed to start:\n\`\`\`\n${started.error}\n\`\`\``,
            );
          }
        } else {
          setStartError({ kind: "no-config" });
        }
      } catch (err) {
        if (!alive) return;
        setStartError({
          kind: "start-failed",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (alive) setProbeDone(true);
      }
    })();
    return () => {
      alive = false;
    };
    // session cwd / id drive re-probe; submitToChat identity not required each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.cwd, sessionRef?.id, sessionRef?.type]);

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
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, target.path).then((dataUrl) => ({
            dataUrl: dataUrl ?? undefined,
          }))
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
        setState({
          error: error instanceof Error ? error.message : String(error),
          isLoading: false,
        });
      });
    return () => {
      alive = false;
    };
  }, [bridge, selectedTarget, sessionRef]);

  const onSetup = useCallback(() => {
    // Official S → submitToChat(detect prompt). Prefer true submit over composer attach-only.
    if (actions?.submitToChat) {
      void actions.submitToChat(OFFICIAL_PREVIEW_SETUP_PROMPT);
      return;
    }
    actions?.attachAsContext?.(OFFICIAL_PREVIEW_SETUP_PROMPT);
  }, [actions]);

  // File / HTML path preview when transcript opened a concrete target.
  if (selectedTarget) {
    const title = selectedTarget.title ?? basename(selectedTarget.path) ?? selectedTarget.path;
    return (
      <div className="h-full min-w-0 flex flex-col bg-bg-000">
        <div className="flex items-center gap-g4 border-b border-border-300 px-p6 py-p4">
          <Icon name="NoteSquareLines" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-body text-t8">{title}</div>
            <div className="truncate text-caption text-t5">{selectedTarget.path}</div>
          </div>
          <OfficialButton
            ariaLabel="Copy path"
            icon="CopySquareBehind"
            onClick={() => void navigator.clipboard?.writeText(selectedTarget.path)}
          />
          {bridge.openInEditor ? (
            <OfficialButton
              ariaLabel="Open in editor"
              icon="Folder1Open"
              onClick={() => void bridge.openInEditor?.(selectedTarget.path)}
            />
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {state.isLoading ? (
            <div role="status" className="h-full flex items-center justify-center text-t5">
              <OfficialSpinner />
              <span className="sr-only">Loading preview</span>
            </div>
          ) : state.error ? (
            <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">
              {state.error}
            </div>
          ) : state.dataUrl ? (
            <div className="flex min-h-full items-center justify-center p-p8">
              <img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
            </div>
          ) : isHtmlPreviewPath(selectedTarget.path) && state.text !== undefined ? (
            <iframe
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={state.text}
              title={title}
            />
          ) : (
            <pre className="m-0 min-w-max p-p8 text-code text-t8 leading-[18px] whitespace-pre-wrap">
              {state.text ?? ""}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Live server iframe when Launch started a server with URL.
  if (previewUrl && !startError) {
    return (
      <div className="h-full min-w-0 flex flex-col bg-bg-000">
        <iframe className="h-full w-full border-0 bg-white" src={previewUrl} title="Preview" />
      </div>
    );
  }

  // Official cS feed: loading until probe finishes, then no-config / start-failed.
  return (
    <OfficialLaunchActivityFeed
      loadingLabel={probeDone ? null : "Setting up preview"}
      onSetup={onSetup}
      startError={probeDone ? startError : null}
    />
  );
}
