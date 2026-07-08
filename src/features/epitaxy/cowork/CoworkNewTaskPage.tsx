import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type PermissionMode, type WorkspaceContext } from "../../../adapters/desktopBridge";
import { createMessageUuid } from "../../../adapters/desktopBridge/messageUuid";
import { coworkSessionsBasePath } from "../../../shell/sessionPaths";
import { normalizeCoworkPermissionMode } from "../composer/options";
import { CoworkGridBackground } from "./CoworkGridBackground";
import { CoworkHeader } from "./CoworkHeader";
import { CoworkPromptComposer } from "./CoworkPromptComposer";
import { CoworkSuggestions, type CoworkPromptSuggestion } from "./CoworkSuggestions";
import { formatCoworkPromptWithUploadedFiles } from "./coworkUploadedFiles";

type CoworkSubmitOptions = {
  keepGoing?: boolean;
};

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
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);

  useEffect(() => {
    setSelectedWorkspace(workspace);
  }, [workspace]);

  useDefaultPermissionMode(selectedWorkspace.cwd, setPermissionMode);

  const submit = useCallback(async (nextPrompt = prompt, options: CoworkSubmitOptions = {}) => {
    const normalized = nextPrompt.trim();
    const hasSelectedFiles = selectedFilePaths.length > 0;
    if ((!normalized && !hasSelectedFiles) || busy) return;
    const message = formatCoworkPromptWithUploadedFiles(normalized, selectedFilePaths);
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
        skipRedirect: options.keepGoing,
        userSelectedFiles: selectedFilePaths,
        userSelectedFolders: selectedWorkspace.cwd ? [selectedWorkspace.cwd] : undefined,
        workspace: selectedWorkspace,
      });
      setPrompt("");
      setSelectedFilePaths([]);
      if (!options.keepGoing) onNavigate(`${coworkSessionsBasePath}/${encodeURIComponent(session.id)}`);
    } finally {
      setBusy(false);
    }
  }, [busy, model, onNavigate, permissionMode, prompt, selectedFilePaths, selectedWorkspace]);

  const addFiles = useCallback(async () => {
    const filePaths = await desktopBridge.FileSystem.browseFiles?.({
      defaultPath: selectedWorkspace.cwd,
      title: "Add files or photos",
    });
    if (filePaths?.length) setSelectedFilePaths((current) => uniqueStrings([...current, ...filePaths]));
  }, [selectedWorkspace.cwd]);

  const removeFile = useCallback((filePath: string) => {
    setSelectedFilePaths((current) => current.filter((item) => item !== filePath));
  }, []);

  const selectSuggestion = useCallback((suggestion: CoworkPromptSuggestion) => {
    setPrompt(suggestion.prompt);
    setFocusRequestKey((key) => key + 1);
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
                <CoworkPromptComposer
                  busy={busy}
                  focusRequestKey={focusRequestKey}
                  model={model}
                  onAddFiles={addFiles}
                  onModelChange={setModel}
                  onPermissionModeChange={setPermissionMode}
                  onRemoveFile={removeFile}
                  onSubmit={(options) => void submit(prompt, options)}
                  onWorkspaceChange={setSelectedWorkspace}
                  permissionMode={permissionMode}
                  prompt={prompt}
                  selectedFilePaths={selectedFilePaths}
                  setPrompt={setPrompt}
                  workspace={selectedWorkspace}
                />
              </div>
            </div>
            {!busy ? <CoworkSuggestions onSelect={selectSuggestion} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function createCoworkSessionId() {
  return `local_${createMessageUuid().replace(/-/g, "")}`;
}
