import { useEffect, useMemo, useSyncExternalStore } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { OfficialSwitch } from "../../shared/OfficialSwitch";

const USER_SKILL_DETAIL_MESSAGES = {
  enabled: { defaultMessage: "Enabled", id: "V52jNnY+6M" },
  disabled: { defaultMessage: "Disabled", id: "4PQSGeQCas" },
  enableSkill: { defaultMessage: "Enable skill", id: "xNU9rxobQP" },
  selectSkill: { defaultMessage: "Select a skill to view details", id: "ccYDCQ+TEE" },
  descriptionHint: {
    defaultMessage: "Claude uses these descriptions when deciding which skills to use in chat.",
    id: "g08yMBD/54",
  },
} as const satisfies MessageDescriptors;
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { CoworkAssistantMarkdown } from "../../cowork/session/transcript/CoworkAssistantMarkdown";
import { Icon } from "../../../shell/icons";
import { SkillActionsDropdown } from "./SkillActionsDropdown";
import { parseSkillMarkdown } from "./skillMd";
import {
  findUserSkill,
  getUserSkillFiles,
  getUserSkillFilesRevision,
  getUserSkills,
  isUserSkillFilesLoading,
  loadUserSkillFiles,
  subscribeUserSkillFiles,
  subscribeUserSkills,
  type LocalSkillFile,
} from "./userSkillsStore";

/**
 * Official c4313ee9e Pe SkillOverviewView + Fe SkillBodyPreview:
 * files from YLe getLocalSkillFiles (not list hydrate), isLoadingFiles skeleton.
 */
export function UserSkillDetailPanel({
  onEdit,
  onEnabledChange,
  onReplace,
  onShowInFolder,
  onTryInChat,
  onUninstall,
  skillId,
  wiggleEnabled,
}: {
  onEdit: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onReplace: () => void;
  onShowInFolder?: () => void;
  onTryInChat: () => void;
  onUninstall: () => void;
  skillId: string;
  wiggleEnabled: boolean;
}) {
  const text = useI18nText(USER_SKILL_DETAIL_MESSAGES);
  useSyncExternalStore(subscribeUserSkills, getUserSkills, getUserSkills);
  useSyncExternalStore(subscribeUserSkillFiles, getUserSkillFilesRevision, getUserSkillFilesRevision);
  const skill = findUserSkill(skillId);
  const files = getUserSkillFiles(skillId);
  const isLoadingFiles = isUserSkillFilesLoading(skillId);
  useEffect(() => {
    if (!skillId) return;
    void loadUserSkillFiles(skillId);
  }, [skillId]);
  if (!skill) {
    return (
      <div className="flex items-center justify-center h-full text-text-400">
        {text.selectSkill}
      </div>
    );
  }

  const hasMeta = true;
  const description = skill.description?.trim() ?? "";

  return (
    <div className="flex flex-col h-full px-6 pb-6 gap-2">
      <div className="flex items-start justify-between pt-4 pb-3 min-h-14">
        <div className="flex-1 min-w-0">
          <h2 className="font-large-bold text-text-100 truncate">{skill.skillName}</h2>
        </div>
        <div className="flex items-center gap-2">
          {wiggleEnabled ? (
            <label
              className="flex items-center gap-2 cursor-pointer"
              title={skill.enabled ? text.enabled : text.disabled}
            >
              <OfficialSwitch
                aria-label={text.enableSkill}
                checked={skill.enabled}
                onCheckedChange={onEnabledChange}
                size="small"
              />
            </label>
          ) : null}
          <SkillActionsDropdown
            enabled={skill.enabled}
            onEdit={onEdit}
            onReplace={onReplace}
            onShowInFolder={onShowInFolder}
            onTryInChat={onTryInChat}
            onUninstall={onUninstall}
            skillName={skill.skillName}
            wiggleEnabled={wiggleEnabled}
          />
        </div>
      </div>
      <div className="flex gap-8">
        <div className="flex flex-col gap-1">
          <span className="font-small text-text-500">Added by</span>
          <span className="font-base text-text-100">You</span>
        </div>
      </div>
      {description ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-0.5">
            <h3 className="font-small text-text-500 leading-4">Description</h3>
            <OfficialTooltip tooltipContent={text.descriptionHint}>
              <span className="flex items-center cursor-default">
                <Icon className="w-4 h-4 text-text-500" name="Info" />
              </span>
            </OfficialTooltip>
          </div>
          <p className="font-base text-text-300 whitespace-pre-wrap">
            {description.replace(/\\n/g, "\n")}
          </p>
        </div>
      ) : null}
      {hasMeta ? (
        <div className="flex items-center h-8">
          <hr className="flex-1 border-border-300" />
        </div>
      ) : null}
      <SkillBodyPreview files={files} isLoadingFiles={isLoadingFiles} />
    </div>
  );
}

/**
 * Official c4313ee9e Fe: SKILL.md (or first file) via we SkillFilePreview.
 * isLoading → bH 200px skeleton; !file → null.
 */
function SkillBodyPreview({
  files,
  isLoadingFiles,
}: {
  files: LocalSkillFile[];
  isLoadingFiles: boolean;
}) {
  const file = useMemo(
    () => files.find((entry) => entry.path === "SKILL.md" || entry.path.endsWith("/SKILL.md")) ?? files[0] ?? null,
    [files],
  );
  if (isLoadingFiles) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="h-[200px] w-full rounded-md bg-bg-300 animate-pulse" />
      </div>
    );
  }
  if (!file) return null;
  const content = file.content ?? "";
  const parsed = parseSkillMarkdown(content);
  const text = ("error" in parsed ? content : parsed.instructions).replace(/\\n/g, "\n").trim();
  if (!text) return null;
  return (
    <div className="flex-1 min-h-0 overflow-auto leading-[1.65rem]">
      <CoworkAssistantMarkdown className="font-claude-response" text={text} />
    </div>
  );
}
