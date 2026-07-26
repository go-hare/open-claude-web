/**
 * Official SpaceRoute residual (ce28369f9):
 * - gate `on`: load space → not-found umf4JIobGv / wuDmoQol2j
 * - body `cn`: header dn + onpage composer Bs + outputs/sessions Ia + settings qa (w-96)
 *
 * Full residual also has file viewer drawer + CCD dual tab + scheduled tasks —
 * product ports the primary desktop layout first without inventing chrome.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  desktopBridge,
  type CoworkSpaceSummary,
  type PermissionMode,
  type SessionSummary,
  type WorkspaceContext,
} from "../../adapters/desktopBridge";
import { createMessageUuid } from "../../adapters/desktopBridge/messageUuid";
import type { RouteViewProps } from "../../app/routes";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialCoworkPromptBox } from "../epitaxy/OfficialCoworkComposer";
import { coworkSessionsBasePath } from "../cowork/sessionPaths";
import { SpaceDetailHeader } from "./SpaceDetailHeader";
import { SpaceDetailSessions } from "./SpaceDetailSessions";
import { SpaceDetailSettingsPanel } from "./SpaceDetailSettingsPanel";
import { SPACE_DETAIL_MESSAGES } from "./spaceDetailMessages";

const STARRED_STORAGE_KEY = "open-claude.starred-space-ids";

function spaceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/space\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readStarredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STARRED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeStarredIds(ids: Set<string>) {
  try {
    localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota
  }
}

function createCoworkSessionId() {
  return `local_${createMessageUuid().replace(/-/g, "")}`;
}

function workspaceFromFolders(folders: string[], projectName?: string): WorkspaceContext {
  const cwd = folders[0];
  const folderName = cwd?.split(/[\\/]/).filter(Boolean).pop();
  return {
    mode: "local",
    projectName: projectName?.trim() || folderName || "Project",
    branchName: "",
    hasWorktree: false,
    cwd,
    folders: folders.length > 0 ? folders : undefined,
  };
}

export function SpaceDetailPage({ onNavigate }: RouteViewProps) {
  const text = useI18nText(SPACE_DETAIL_MESSAGES);
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "",
  );
  const spaceId = spaceIdFromPath(pathname);
  const [space, setSpace] = useState<CoworkSpaceSummary | null | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [starredIds, setStarredIds] = useState<Set<string>>(() => readStarredIds());
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [model, setModel] = useState("default");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const folderPaths = useMemo(
    () => (space?.folders ?? []).map((folder) => folder.path).filter(Boolean),
    [space?.folders],
  );
  const workspace = useMemo(
    () => workspaceFromFolders(folderPaths, space?.name),
    [folderPaths, space?.name],
  );

  const reload = useCallback(async (id: string) => {
    const bridge = desktopBridge.CoworkSpaces;
    let next: CoworkSpaceSummary | null = null;
    if (bridge?.get) {
      next = await bridge.get(id).catch(() => null);
    }
    if (!next && bridge?.list) {
      const all = await bridge.list().catch(() => []);
      next = all.find((item) => item.id === id) ?? null;
    }
    setSpace(next);
    if (!next) {
      setSessions([]);
      return;
    }
    // Residual UZe/Ks (index-BELzQL5P t1): filter cowork sessions by spaceId only
    // (o6().filter(t => t.spaceId === e)), then sort by createdAt desc. cwd is
    // synthetic /sessions/<id> on host and must not be used for association.
    const allSessions = await desktopBridge.LocalAgentModeSessions.list().catch(() => []);
    setSessions(
      allSessions
        .filter((session) => session.spaceId === id)
        .sort(
          (left, right) =>
            (right.createdAtMs ?? right.updatedAtMs) - (left.createdAtMs ?? left.updatedAtMs),
        ),
    );
  }, []);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    const timer = window.setInterval(() => {
      if (window.location.pathname !== pathname) setPathname(window.location.pathname);
    }, 400);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (!spaceId) {
      setSpace(null);
      setSessions([]);
      return;
    }
    let active = true;
    void (async () => {
      await reload(spaceId);
      if (!active) return;
    })();
    const unsubSpace = desktopBridge.CoworkSpaces?.onEvent?.(() => {
      void reload(spaceId);
    });
    const unsubSessions = desktopBridge.LocalAgentModeSessions.onEvent?.(() => {
      void reload(spaceId);
    });
    return () => {
      active = false;
      unsubSpace?.();
      unsubSessions?.();
    };
  }, [reload, spaceId]);

  const toggleStarred = useCallback(() => {
    if (!spaceId) return;
    setStarredIds((current) => {
      const next = new Set(current);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      writeStarredIds(next);
      return next;
    });
  }, [spaceId]);

  const submit = useCallback(async () => {
    const normalized = prompt.trim();
    if (!normalized || busy || !spaceId) return;
    setBusy(true);
    setPendingPrompt(normalized);
    try {
      const messageUuid = createMessageUuid();
      const sessionId = createCoworkSessionId();
      const session = await desktopBridge.LocalAgentModeSessions.start({
        kind: "epitaxy",
        message: normalized,
        messageUuid,
        model: model === "default" ? undefined : model,
        permissionMode,
        prompt: normalized,
        sessionId,
        spaceId,
        userSelectedFolders: folderPaths.length > 0 ? folderPaths : undefined,
        workspace,
      });
      setPrompt("");
      setPendingPrompt(null);
      onNavigate(`${coworkSessionsBasePath}/${encodeURIComponent(session.id)}`);
    } catch {
      setPendingPrompt(null);
    } finally {
      setBusy(false);
    }
  }, [busy, folderPaths, model, onNavigate, permissionMode, prompt, spaceId, workspace]);

  if (space === undefined) {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center text-text-500"
        data-official-source="ce28369f9-C9QQvDN-.js:on"
      />
    );
  }

  if (!space || !spaceId) {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center text-text-500"
        data-official-source="ce28369f9-C9QQvDN-.js:on not-found"
      >
        <p className="text-lg font-medium">{text.notFoundTitle}</p>
        <p className="mt-1 text-sm">{text.notFoundBody}</p>
        <OfficialButton className="mt-4" onClick={() => onNavigate("/projects")} size="sm" variant="secondary">
          {text.openProjects}
        </OfficialButton>
      </div>
    );
  }

  return (
    <div className="relative flex h-full" data-official-source="ce28369f9-C9QQvDN-.js:cn">
      <div className="h-full min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-6">
          <SpaceDetailHeader
            onToggleStarred={toggleStarred}
            space={space}
            starred={starredIds.has(spaceId)}
            text={text}
          />

          <div data-official-source="ce28369f9-C9QQvDN-.js:Bs onpage">
            <div className="px-3 md:px-2">
              <OfficialCoworkPromptBox
                busy={busy}
                model={model}
                onModelChange={setModel}
                onNavigate={onNavigate}
                onPermissionModeChange={setPermissionMode}
                onSubmit={() => void submit()}
                onWorkspaceChange={() => undefined}
                permissionMode={permissionMode}
                placeholder={text.composerPlaceholder}
                prompt={prompt}
                setPrompt={setPrompt}
                workspace={workspace}
              />
            </div>
          </div>

          <SpaceDetailSessions
            onNavigate={onNavigate}
            pendingPrompt={pendingPrompt}
            sessions={sessions}
            text={text}
          />
        </div>
      </div>

      <div
        className="h-full w-96 flex-shrink-0 overflow-hidden"
        data-official-source="ce28369f9-C9QQvDN-.js:qa rail"
      >
        <SpaceDetailSettingsPanel
          folders={folderPaths}
          instructions={space.instructions ?? ""}
          links={space.links ?? []}
          onFoldersChange={(next) => {
            setSpace((current) =>
              current
                ? {
                    ...current,
                    folders: next.map((path) => ({ path })),
                  }
                : current,
            );
          }}
          onInstructionsChange={(next) => {
            setSpace((current) => (current ? { ...current, instructions: next || null } : current));
          }}
          onLinksChange={(next) => {
            setSpace((current) => (current ? { ...current, links: next } : current));
          }}
          onNavigate={onNavigate}
          spaceId={spaceId}
          text={text}
        />
      </div>
    </div>
  );
}
