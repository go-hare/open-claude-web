import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { ConnectorsPageSidebar } from "../connectors/ConnectorsPageSidebar";
import { AddSkillDropdown } from "./AddSkillDropdown";
import { SkillDocumentIcon, SkillIconTile } from "./SkillDocumentIcon";
import { SkillsCollapsibleSection } from "./SkillsCollapsibleSection";
import { SkillsListItem } from "./SkillsListItem";
import type { BuiltInSkill, UserSkill } from "./skillTypes";

/**
 * Official c63a78ed4 Rl / SkillsPageSidebar + Bl / SkillsGroupedList.
 */
export function SkillsPageSidebar({
  userSkills,
  builtInSkills,
  selectedBuiltInName,
  onBuiltInSelect,
  onBrowseSkills,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
  wiggleEnabled,
}: {
  userSkills: UserSkill[];
  builtInSkills: BuiltInSkill[];
  selectedBuiltInName: string | null;
  onBuiltInSelect: (name: string) => void;
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
  wiggleEnabled: boolean;
}) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const isSearching = searchQuery.trim().length > 0;
  const query = searchQuery.trim().toLowerCase();

  const filteredBuiltIns = useMemo(
    () => (query ? builtInSkills.filter((skill) => skill.name.toLowerCase().includes(query)) : builtInSkills),
    [builtInSkills, query],
  );

  // User skill partitions (official Bl) — local shell typically empty until list-skills API.
  const personalSkills = useMemo(
    () =>
      userSkills.filter((skill) => {
        if (skill.partitionBy === "organization") return false;
        if (skill.creatorType === "anthropic" && skill.isPublicProvisioned === false) return false;
        if (skill.isShared || skill.hasOutgoingShares) return false;
        return skill.enabled;
      }),
    [userSkills],
  );
  const sharedSkills = useMemo(
    () => userSkills.filter((skill) => skill.isShared || skill.hasOutgoingShares),
    [userSkills],
  );
  const orgSkills = useMemo(
    () =>
      userSkills.filter(
        (skill) => skill.partitionBy === "organization" || (skill.creatorType === "anthropic" && skill.isPublicProvisioned === false),
      ),
    [userSkills],
  );

  const hasUserGroups = personalSkills.length > 0 || sharedSkills.length > 0 || orgSkills.length > 0;
  const hasBuiltIns = filteredBuiltIns.length > 0;
  const isEmpty = userSkills.length === 0 && builtInSkills.length === 0;

  const title: ReactNode = isSearchOpen ? (
    <input
      ref={searchInputRef}
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeSearch();
      }}
      placeholder="搜索"
      className="flex-1 h-8 min-w-0 rounded-md border border-border-300 bg-bg-100 px-2 text-sm outline-none focus:shadow-focus"
    />
  ) : (
    "Skills"
  );

  const headerAction = isSearchOpen ? (
    <button
      type="button"
      aria-label="Close search"
      onClick={closeSearch}
      className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
    >
      <Icon name="x" />
    </button>
  ) : (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Search skills"
        onClick={() => setSearchOpen(true)}
        className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
      >
        <Icon name="Search" />
      </button>
      {wiggleEnabled ? (
        <AddSkillDropdown
          onBrowseSkills={onBrowseSkills}
          onCreateWithClaude={onCreateWithClaude}
          onWriteInstructions={onWriteInstructions}
          onUpload={onUpload}
        />
      ) : null}
    </div>
  );

  return (
    <ConnectorsPageSidebar title={title} headerAction={headerAction}>
      {isEmpty ? (
        <SkillsListEmptyState wiggleEnabled={wiggleEnabled} onAddSkill={onBrowseSkills} />
      ) : (
        <div className="flex flex-col gap-px">
          {personalSkills.length > 0 ? (
            <SkillsCollapsibleSection title="Personal skills" forceExpanded={isSearching}>
              <div className="flex flex-col gap-px">
                {personalSkills.map((skill) => (
                  <SkillsListItem
                    key={skill.skillId}
                    id={skill.skillId}
                    name={skill.skillName}
                    icon={
                      <SkillIconTile>
                        <SkillDocumentIcon size={16} />
                      </SkillIconTile>
                    }
                    isSelected={false}
                    onSelect={() => undefined}
                    isEnabled={skill.enabled}
                  />
                ))}
              </div>
            </SkillsCollapsibleSection>
          ) : null}

          {sharedSkills.length > 0 ? (
            <>
              {personalSkills.length > 0 ? <SectionDivider /> : null}
              <SkillsCollapsibleSection title="Shared skills" forceExpanded={isSearching}>
                <div className="flex flex-col gap-px">
                  {sharedSkills.map((skill) => (
                    <SkillsListItem
                      key={skill.skillId}
                      id={skill.skillId}
                      name={skill.skillName}
                      icon={
                        <SkillIconTile>
                          <SkillDocumentIcon size={16} />
                        </SkillIconTile>
                      }
                      isSelected={false}
                      onSelect={() => undefined}
                      isEnabled={skill.enabled}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            </>
          ) : null}

          {orgSkills.length > 0 ? (
            <>
              {personalSkills.length + sharedSkills.length > 0 ? <SectionDivider /> : null}
              <SkillsCollapsibleSection title="Organization skills" forceExpanded={isSearching}>
                <div className="flex flex-col gap-px">
                  {orgSkills.map((skill) => (
                    <SkillsListItem
                      key={skill.skillId}
                      id={skill.skillId}
                      name={skill.skillName}
                      icon={
                        <SkillIconTile>
                          <SkillDocumentIcon size={16} />
                        </SkillIconTile>
                      }
                      isSelected={false}
                      onSelect={() => undefined}
                      isEnabled={skill.enabled}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            </>
          ) : null}

          {hasBuiltIns ? (
            <>
              {hasUserGroups ? <SectionDivider /> : null}
              <SkillsCollapsibleSection title="Built-in skills" forceExpanded={isSearching}>
                <div className="flex flex-col gap-px">
                  {filteredBuiltIns.map((skill) => (
                    <SkillsListItem
                      key={skill.name}
                      id={skill.name}
                      name={skill.name}
                      icon={
                        <SkillIconTile>
                          <SkillDocumentIcon size={16} />
                        </SkillIconTile>
                      }
                      isSelected={skill.name === selectedBuiltInName}
                      onSelect={onBuiltInSelect}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            </>
          ) : null}
        </div>
      )}
    </ConnectorsPageSidebar>
  );
}

function SectionDivider() {
  return <hr className="border-t border-border-300 my-2" />;
}

/** Official ql — empty only when both user + built-in lists are empty. */
function SkillsListEmptyState({ wiggleEnabled, onAddSkill }: { wiggleEnabled: boolean; onAddSkill: () => void }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col gap-6 items-center">
        <p className="font-small text-text-300 text-center px-6 text-pretty">
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
            onClick={onAddSkill}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-text-000 px-3 text-sm text-bg-000 hover:opacity-90"
          >
            Add skill
          </button>
        ) : null}
      </div>
    </div>
  );
}
