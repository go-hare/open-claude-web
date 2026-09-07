import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { SKILLS_ENABLED } from "../customizeGates";
import { BuiltInSkillDetailPanel } from "./BuiltInSkillDetailPanel";
import { NewSkillModal } from "./NewSkillModal";
import { UserSkillDetailPanel } from "./UserSkillDetailPanel";
import { SkillsPageSidebar } from "./SkillsPageSidebar";
import { UploadSkillModal } from "./UploadSkillModal";
import { WriteSkillInstructionsModal } from "./WriteSkillInstructionsModal";
import type { SkillsSelection } from "./skillTypes";
import { useBuiltInSkills } from "./useBuiltInSkills";
import {
  findUserSkill,
  getUserSkills,
  loadUserSkillInstructions,
  removeUserSkill,
  setUserSkillEnabled,
  subscribeUserSkills,
  upsertUserSkill,
} from "./userSkillsStore";

/**
 * Official c63a78ed4 $l Skills route:
 * empty Jl Add skill → Ol; Write → yt F; Upload → ht J (not Directory / S7t).
 * Te: Enable + Try in chat / Edit / Replace / Uninstall.
 */
export function SkillsRoute({
  onBrowseSkills,
  onCreateWithClaude,
  onTryInCowork,
}: {
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onTryInCowork?: (skillName: string) => void;
}) {
  const userSkills = useSyncExternalStore(subscribeUserSkills, getUserSkills, getUserSkills);
  const { builtInSkills, isLoading } = useBuiltInSkills();
  const wiggleEnabled = SKILLS_ENABLED;
  const [selection, setSelection] = useState<SkillsSelection>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<{
    description: string;
    instructions: string;
    skillId: string;
    skillName: string;
  } | null>(null);
  const [replaceSkillId, setReplaceSkillId] = useState<string | null>(null);
  const [uninstallSkillId, setUninstallSkillId] = useState<string | null>(null);

  const openCreation = useCallback(() => {
    setCreationOpen(true);
  }, []);

  const closeCreation = useCallback(() => {
    setCreationOpen(false);
  }, []);

  const onCreateWithClaudeFromModal = useCallback(() => {
    setCreationOpen(false);
    onCreateWithClaude?.();
  }, [onCreateWithClaude]);

  /** Official ce: close Ol then D(true) → yt Write skill instructions. */
  const onWriteFromModal = useCallback(() => {
    setCreationOpen(false);
    setSkillToEdit(null);
    setWriteOpen(true);
  }, []);

  /** Official ue: close Ol then q("upload") → ht Upload skill. */
  const onUploadFromModal = useCallback(() => {
    setCreationOpen(false);
    setReplaceSkillId(null);
    setUploadOpen(true);
  }, []);

  const selectedBuiltIn = useMemo(() => {
    if (selection?.kind !== "builtin") return null;
    return builtInSkills.find((skill) => skill.name === selection.name) ?? null;
  }, [builtInSkills, selection]);

  const selectedUser =
    selection?.kind === "skill"
      ? userSkills.find((skill) => skill.skillId === selection.skillId) ?? null
      : null;

  const selectedBuiltInName = selection?.kind === "builtin" ? selection.name : null;

  const onBuiltInSelect = useCallback((name: string) => {
    setSelection({ kind: "builtin", name });
  }, []);

  const onUserSelect = useCallback((skillId: string) => {
    setSelection({ kind: "skill", skillId, filePath: null });
  }, []);

  const existingNames = useMemo(() => {
    const names = userSkills.map((skill) => skill.skillName);
    if (!replaceSkillId) return names;
    const replacing = userSkills.find((skill) => skill.skillId === replaceSkillId);
    return replacing ? names.filter((name) => name !== replacing.skillName) : names;
  }, [replaceSkillId, userSkills]);

  const closeWrite = useCallback(() => {
    setWriteOpen(false);
    setSkillToEdit(null);
  }, []);

  const closeUpload = useCallback(() => {
    setUploadOpen(false);
    setReplaceSkillId(null);
  }, []);

  if (isLoading) {
    return <SkillsLoadingSkeleton />;
  }

  const isGlobalEmpty = userSkills.length === 0 && builtInSkills.length === 0;

  const creationChrome = (
    <>
      <NewSkillModal
        isOpen={creationOpen}
        onClose={closeCreation}
        onCreateWithClaude={onCreateWithClaudeFromModal}
        onUpload={onUploadFromModal}
        onWriteInstructions={onWriteFromModal}
      />
      <WriteSkillInstructionsModal
        isOpen={writeOpen}
        onClose={closeWrite}
        onCreate={async (value) => {
          const created = await upsertUserSkill({
            skillId: value.skillId,
            skillName: value.name,
            description: value.description,
            instructions: value.instructions,
          });
          closeWrite();
          setSelection({ kind: "skill", skillId: created.skillId, filePath: null });
        }}
        skillToEdit={skillToEdit}
      />
      <UploadSkillModal
        existingNames={existingNames}
        isOpen={uploadOpen}
        onClose={closeUpload}
        onUploaded={(value) => {
          void upsertUserSkill({
            skillId: replaceSkillId ?? undefined,
            skillName: value.name,
            description: value.description,
            instructions: value.instructions,
          }).then((created) => {
            closeUpload();
            setSelection({ kind: "skill", skillId: created.skillId, filePath: null });
          });
        }}
      />
      <ConfirmDialog
        cancelText="Cancel"
        confirmText="Uninstall"
        isOpen={Boolean(uninstallSkillId)}
        message="You can always add this skill again later by re-uploading it."
        onClose={() => setUninstallSkillId(null)}
        onConfirm={() => {
          if (!uninstallSkillId) return;
          const skillId = uninstallSkillId;
          void removeUserSkill(skillId).then(() => {
            if (selection?.kind === "skill" && selection.skillId === skillId) {
              setSelection(null);
            }
            setUninstallSkillId(null);
          });
        }}
        title="Uninstall skill?"
        variant="danger"
      />
    </>
  );

  if (isGlobalEmpty) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {creationChrome}
        <div className="flex flex-col items-center gap-6">
          <p className="font-small text-text-300 text-center px-6 text-pretty max-w-[300px]">
            Add skills to extend Claude&apos;s capabilities.{" "}
            <a
              href="https://support.claude.com/en/articles/12512198-creating-custom-skills"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-text-100"
            >
              Learn more
            </a>
          </p>
          {wiggleEnabled ? (
            <button
              type="button"
              onClick={openCreation}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-text-000 px-3 text-sm text-bg-000 hover:opacity-90"
            >
              Add skill
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {creationChrome}
      <SkillsPageSidebar
        userSkills={userSkills}
        builtInSkills={builtInSkills}
        selectedBuiltInName={selectedBuiltInName}
        selectedUserSkillId={selection?.kind === "skill" ? selection.skillId : null}
        onBuiltInSelect={onBuiltInSelect}
        onUserSelect={onUserSelect}
        onBrowseSkills={onBrowseSkills}
        onCreateWithClaude={onCreateWithClaude}
        onWriteInstructions={onWriteFromModal}
        onUpload={onUploadFromModal}
        onAddSkill={openCreation}
        wiggleEnabled={wiggleEnabled}
      />
      <div tabIndex={-1} className="flex-1 overflow-y-auto bg-bg-100 focus-visible:outline-none">
        {selectedBuiltIn ? (
          <BuiltInSkillDetailPanel skill={selectedBuiltIn} onTryInCowork={onTryInCowork} />
        ) : selectedUser ? (
          <UserSkillDetailPanel
            onEdit={() => {
              const stored = findUserSkill(selectedUser.skillId);
              if (!stored) return;
              void loadUserSkillInstructions(stored.skillId).then((instructions) => {
                setSkillToEdit({
                  skillId: stored.skillId,
                  skillName: stored.skillName,
                  description: stored.description ?? "",
                  instructions,
                });
                setWriteOpen(true);
              });
            }}
            onEnabledChange={(enabled) => setUserSkillEnabled(selectedUser.skillId, enabled)}
            onReplace={() => {
              setReplaceSkillId(selectedUser.skillId);
              setUploadOpen(true);
            }}
            onShowInFolder={() => {
              void desktopBridge.LocalAgentModeSessions.revealLocalSkill?.(selectedUser.skillId);
            }}
            onTryInChat={() => onTryInCowork?.(selectedUser.skillName)}
            onUninstall={() => setUninstallSkillId(selectedUser.skillId)}
            skillId={selectedUser.skillId}
            wiggleEnabled={wiggleEnabled}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-400">Select a skill to view details</div>
        )}
      </div>
    </div>
  );
}

function SkillsLoadingSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="border-r border-border-300 w-[280px] min-w-[280px] xl:w-[360px] xl:min-w-[360px]">
        <div className="flex items-center px-6 py-3 min-h-14">
          <div className="h-5 bg-bg-300 rounded w-16" />
        </div>
        <div className="px-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 bg-bg-300 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 bg-bg-100" />
    </div>
  );
}
