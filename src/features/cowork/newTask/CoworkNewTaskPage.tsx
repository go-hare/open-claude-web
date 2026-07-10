import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type CoworkMountedProject, type PermissionMode, type SessionSummary, type WorkspaceContext } from "../../../adapters/desktopBridge";
import { createMessageUuid } from "../../../adapters/desktopBridge/messageUuid";
import { coworkSessionsBasePath } from "../sessionPaths";
import { normalizeCoworkPermissionMode } from "../composer/options";
import { CoworkGridBackground } from "./CoworkGridBackground";
import { CoworkHeader } from "./CoworkHeader";
import { CoworkPromptBox } from "../composer/CoworkPromptBox";
import type { CoworkAddMenuProject } from "./CoworkAddMenuItems";
import {
  CoworkProjectWarningDialog,
  coworkMountedProjectFromAddMenuProject,
  persistCoworkProjectWarningDismissed,
  sessionToCoworkAddMenuProject,
  shouldShowCoworkProjectWarning,
  type CoworkPendingProjectWarning,
} from "./CoworkProjectContext";
import { CoworkSuggestions, type CoworkPromptSuggestion } from "./CoworkSuggestions";
import { coworkUploadedFilePaths, formatCoworkPromptWithUploadedFiles, mergeCoworkUploadedFiles, type CoworkUploadedFile } from "./coworkUploadedFiles";

export function CoworkNewTaskPage({
  onNavigate,
  workspace,
}: {
  onNavigate: (path: string) => void;
  workspace: WorkspaceContext;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [model, setModel] = useState("default");
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspace);
  const [selectedFiles, setSelectedFiles] = useState<CoworkUploadedFile[]>([]);
  const [detectedProjects, setDetectedProjects] = useState<SessionSummary[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<CoworkMountedProject[]>([]);
  const [pendingProjectWarning, setPendingProjectWarning] = useState<CoworkPendingProjectWarning | null>(null);

  useEffect(() => {
    setSelectedWorkspace(workspace);
  }, [workspace]);
  useDetectedProjects(setDetectedProjects);

  useDefaultPermissionMode(selectedWorkspace.cwd, setPermissionMode);
  const projectMenuItems = detectedProjects.flatMap((project) => {
    const item = sessionToCoworkAddMenuProject(project);
    if (!item) return [];
    return [{ ...item, checked: selectedProjects.some((selected) => selected.uuid === item.uuid) }];
  });

  const submit = useCallback(async (nextPrompt = prompt) => {
    const normalized = nextPrompt.trim();
    const hasSelectedFiles = selectedFiles.length > 0;
    if ((!normalized && !hasSelectedFiles) || busy) return;
    const message = formatCoworkPromptWithUploadedFiles(normalized, selectedFiles);
    const selectedFilePaths = coworkUploadedFilePaths(selectedFiles);
    setBusy(true);
    try {
      const messageUuid = createMessageUuid();
      const sessionId = createCoworkSessionId();
      const session = await desktopBridge.LocalAgentModeSessions.start({
        kind: "epitaxy",
        message,
        messageUuid,
        model: model === "default" ? undefined : model,
        permissionMode,
        prompt: message,
        sessionId,
        userSelectedFiles: selectedFilePaths,
        userSelectedFolders: selectedWorkspace.cwd ? [selectedWorkspace.cwd] : undefined,
        mountedProjects: selectedProjects,
        workspace: selectedWorkspace,
      });
      setPrompt("");
      setSelectedFiles([]);
      setSelectedProjects([]);
      onNavigate(`${coworkSessionsBasePath}/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, model, onNavigate, permissionMode, prompt, selectedFiles, selectedProjects, selectedWorkspace]);

  const addFiles = useCallback(async () => {
    const filePaths = await desktopBridge.FileSystem.browseFiles?.({
      defaultPath: selectedWorkspace.cwd,
      title: "Add files or photos",
    });
    if (filePaths?.length) setSelectedFiles((current) => mergeCoworkUploadedFiles(current, filePaths));
  }, [selectedWorkspace.cwd]);

  const removeFile = useCallback((filePath: string) => {
    setSelectedFiles((current) => current.filter((item) => item.path !== filePath));
  }, []);

  const selectSuggestion = useCallback((suggestion: CoworkPromptSuggestion) => {
    setPrompt(suggestion.prompt);
    setFocusRequestKey((key) => key + 1);
  }, []);
  const requestProject = useCallback((project: CoworkAddMenuProject) => {
    if (!shouldShowCoworkProjectWarning(project.uuid)) {
      addSelectedProject(project, setSelectedProjects);
      return;
    }
    setPendingProjectWarning({ project, variant: "addMenu" });
  }, []);
  const confirmProject = useCallback((project: CoworkAddMenuProject, dontShowAgain: boolean) => {
    if (dontShowAgain) persistCoworkProjectWarningDismissed(project.uuid);
    addSelectedProject(project, setSelectedProjects);
    setPendingProjectWarning(null);
  }, []);

  return (
    <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl h-full !mt-0 !px-0 !max-w-none">
      <div className="flex h-full">
        <div className="relative isolate flex h-full min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
          <CoworkGridBackground />
          <div className="flex flex-1 flex-col items-center justify-start px-4 pb-6 pt-24 md:px-14">
            <div className="w-full max-w-2xl">
              <div className="mb-4">
                <CoworkHeader />
                <CoworkPromptBox
                  busy={busy}
                  focusRequestKey={focusRequestKey}
                  model={model}
                  onAddFiles={addFiles}
                  onModelChange={setModel}
                  onNavigate={onNavigate}
                  onProjectSelect={requestProject}
                  onPermissionModeChange={setPermissionMode}
                  onRemoveProject={(uuid) => setSelectedProjects((current) => current.filter((project) => project.uuid !== uuid))}
                  onRemoveFile={removeFile}
                  onSubmit={() => void submit(prompt)}
                  onWorkspaceChange={setSelectedWorkspace}
                  permissionMode={permissionMode}
                  prompt={prompt}
                  projectMenuItems={projectMenuItems}
                  selectedFiles={selectedFiles}
                  selectedProjects={selectedProjects}
                  setPrompt={setPrompt}
                  workspace={selectedWorkspace}
                />
                <CoworkProjectWarningDialog onCancel={() => setPendingProjectWarning(null)} onConfirm={confirmProject} pending={pendingProjectWarning} />
              </div>
            </div>
            {!busy ? <CoworkSuggestions onSelect={selectSuggestion} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function addSelectedProject(project: NonNullable<ReturnType<typeof sessionToCoworkAddMenuProject>>, setSelectedProjects: (updater: (current: CoworkMountedProject[]) => CoworkMountedProject[]) => void) {
  const mounted = coworkMountedProjectFromAddMenuProject(project);
  if (!mounted) return;
  setSelectedProjects((current) => current.some((item) => item.uuid === mounted.uuid) ? current.filter((item) => item.uuid !== mounted.uuid) : [...current, mounted]);
}

function useDetectedProjects(setDetectedProjects: (projects: SessionSummary[]) => void) {
  useEffect(() => {
    let active = true;
    void desktopBridge.LocalAgentModeSessions.getDetectedProjects?.()
      .then((projects) => { if (active) setDetectedProjects(projects ?? []); })
      .catch(() => { if (active) setDetectedProjects([]); });
    return () => {
      active = false;
    };
  }, [setDetectedProjects]);
}

function useDefaultPermissionMode(cwd: string | undefined, setPermissionMode: (mode: PermissionMode) => void) {
  useEffect(() => {
    let active = true;
    void desktopBridge.LocalAgentModeSessions.getDefaultPermissionMode?.(cwd)
      .then((value) => {
        if (active) setPermissionMode(normalizeCoworkPermissionMode(value));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [cwd, setPermissionMode]);
}

function createCoworkSessionId() {
  return `local_${createMessageUuid().replace(/-/g, "")}`;
}
