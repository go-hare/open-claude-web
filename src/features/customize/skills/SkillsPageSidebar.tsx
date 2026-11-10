import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { ConnectorsPageSidebar } from "../connectors/ConnectorsPageSidebar";
import { AddSkillDropdown } from "./AddSkillDropdown";
import { ObjectPaperAirplane } from "./ObjectPaperAirplane";
import { SkillDocumentIcon, SkillIconTile } from "./SkillDocumentIcon";
import { SkillsCollapsibleSection } from "./SkillsCollapsibleSection";
import { SkillsListItem } from "./SkillsListItem";
import type { BuiltInSkill, UserSkill } from "./skillTypes";

const SKILLS_SIDEBAR_MESSAGES = {
  skills: { defaultMessage: "Skills", id: "EJSVsOA19u" },
  searchSkillsAndPlugins: { defaultMessage: "Search skills and plugins", id: "n3VpmrDQYa" },
  yourSkills: { defaultMessage: "Your skills", id: "7Ktj7zC8i7" },
  addYourFirstSkills: { defaultMessage: "Add your first skills", id: "gcU7Ur/D71" },
  skillsTeachClaude: { defaultMessage: "Skills teach Claude how you work.", id: "w39ST2SJHc" },
  addSkillsToExtend: {
    defaultMessage: "Add skills to extend Claude's capabilities.",
    id: "h8u1GJ6wFK",
  },
  learnMore: { defaultMessage: "Learn more", id: "TdTXXf940t" },
  addSkill: { defaultMessage: "Add skill", id: "tnEMvwSDlT" },
  personalSkills: { defaultMessage: "Personal skills", id: "udpoBdUqwm" },
  sharedSkills: { defaultMessage: "Shared skills", id: "aiCChO0XAI" },
  organizationSkills: { defaultMessage: "Organization skills", id: "12IeD4rgwv" },
  builtInSkills: { defaultMessage: "Built-in skills", id: "vjWCD7euEv" },
} as const satisfies MessageDescriptors;

/**
 * Official CDS Tabs.Tab Pt (shared-10): selected chip is fill-ghost-hover + rounded.
 * Product CSS has `.bg-fill-ghost-hover` but not `data-[active]:before:bg-*`, so paint
 * the selected fill on the tab itself (overlay mine is the only tab / always active).
 */
const OVERLAY_SKILLS_TAB_CLASS =
  "inline-flex h-control shrink-0 items-center justify-center px-md rounded cds-reset whitespace-nowrap select-none outline-none text-body font-medium font-control text-primary bg-fill-ghost-hover";

/**
 * Official c63a78ed4 Rl / SkillsPageSidebar + Bl / SkillsGroupedList.
 */
export function SkillsPageSidebar({
  userSkills,
  builtInSkills,
  layout = "page",
  selectedBuiltInName,
  selectedUserSkillId,
  onBuiltInSelect,
  onUserSelect,
  onBrowseSkills,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
  onAddSkill,
  wiggleEnabled,
}: {
  userSkills: UserSkill[];
  builtInSkills: BuiltInSkill[];
  /** Official overlay Ar uses a single-column vt list, not CustomizePageSidebar. */
  layout?: "page" | "overlay";
  selectedBuiltInName: string | null;
  selectedUserSkillId?: string | null;
  onBuiltInSelect: (name: string) => void;
  onUserSelect?: (skillId: string) => void;
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
  /** Official ql onAddSkill — empty list Add skill opens Ol (re), not Directory. */
  onAddSkill?: () => void;
  wiggleEnabled: boolean;
}) {
  const text = useI18nText(SKILLS_SIDEBAR_MESSAGES);
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

  // Official Rl: filteredSkills = skillName includes query, then group (your/shared/admin).
  const filteredUserSkills = useMemo(
    () => (query ? userSkills.filter((skill) => skill.skillName.toLowerCase().includes(query)) : userSkills),
    [query, userSkills],
  );
  const filteredBuiltIns = useMemo(
    () => (query ? builtInSkills.filter((skill) => skill.name.toLowerCase().includes(query)) : builtInSkills),
    [builtInSkills, query],
  );

  // Official Bl Personal skills includes disabled (`isEnabled={skill.enabled}` dims the row).
  const personalSkills = useMemo(
    () =>
      filteredUserSkills.filter((skill) => {
        if (skill.partitionBy === "organization") return false;
        if (skill.creatorType === "anthropic" && skill.isPublicProvisioned === false) return false;
        if (skill.isShared || skill.hasOutgoingShares) return false;
        return true;
      }),
    [filteredUserSkills],
  );
  const sharedSkills = useMemo(
    () => filteredUserSkills.filter((skill) => skill.isShared || skill.hasOutgoingShares),
    [filteredUserSkills],
  );
  const orgSkills = useMemo(
    () =>
      filteredUserSkills.filter(
        (skill) => skill.partitionBy === "organization" || (skill.creatorType === "anthropic" && skill.isPublicProvisioned === false),
      ),
    [filteredUserSkills],
  );

  const hasUserGroups = personalSkills.length > 0 || sharedSkills.length > 0 || orgSkills.length > 0;
  const hasBuiltIns = filteredBuiltIns.length > 0;
  const isEmpty = userSkills.length === 0 && builtInSkills.length === 0;
  /** Official Ht = it.length===0 — overlay mine empty hides builtins (`Ht?$t`). */
  const overlayMineEmpty = layout === "overlay" && userSkills.length === 0 && !isSearching;

  const title: ReactNode = isSearchOpen ? (
    <OfficialTextInput
      className="flex-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeSearch();
      }}
      onValueChange={setSearchQuery}
      placeholder="搜索"
      prepend={<Icon className="text-text-300" customSize={16} name="Search" />}
      ref={searchInputRef}
      size="sm"
      value={searchQuery}
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

  const listBody = isEmpty ? (
    <SkillsListEmptyState wiggleEnabled={wiggleEnabled} onAddSkill={onAddSkill ?? onBrowseSkills} />
  ) : (
    <div className="flex flex-col gap-px">
      {personalSkills.length > 0 ? (
        <SkillsCollapsibleSection title={text.personalSkills} forceExpanded={isSearching}>
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
                isSelected={selectedUserSkillId === skill.skillId}
                onSelect={onUserSelect ?? (() => undefined)}
                isEnabled={skill.enabled}
              />
            ))}
          </div>
        </SkillsCollapsibleSection>
      ) : null}

      {sharedSkills.length > 0 ? (
        <>
          {personalSkills.length > 0 ? <SectionDivider /> : null}
          <SkillsCollapsibleSection title={text.sharedSkills} forceExpanded={isSearching}>
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
                  isSelected={selectedUserSkillId === skill.skillId}
                  onSelect={onUserSelect ?? (() => undefined)}
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
          <SkillsCollapsibleSection title={text.organizationSkills} forceExpanded={isSearching}>
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
                  isSelected={selectedUserSkillId === skill.skillId}
                  onSelect={onUserSelect ?? (() => undefined)}
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
          <SkillsCollapsibleSection title={text.builtInSkills} forceExpanded={isSearching}>
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
  );

  if (layout === "overlay") {
    const overlayList =
      overlayMineEmpty ? (
        <SkillsOverlayFirstRun />
      ) : isEmpty ? (
        <SkillsListEmptyState wiggleEnabled={wiggleEnabled} onAddSkill={onAddSkill ?? onBrowseSkills} />
      ) : (
        <div className="flex flex-col gap-px">
          {personalSkills.length > 0 ? (
            <SkillsCollapsibleSection title={text.personalSkills} forceExpanded={isSearching}>
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
                    isSelected={selectedUserSkillId === skill.skillId}
                    onSelect={onUserSelect ?? (() => undefined)}
                    isEnabled={skill.enabled}
                  />
                ))}
              </div>
            </SkillsCollapsibleSection>
          ) : null}

          {sharedSkills.length > 0 ? (
            <>
              {personalSkills.length > 0 ? <SectionDivider /> : null}
              <SkillsCollapsibleSection title={text.sharedSkills} forceExpanded={isSearching}>
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
                      isSelected={selectedUserSkillId === skill.skillId}
                      onSelect={onUserSelect ?? (() => undefined)}
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
              <SkillsCollapsibleSection title={text.organizationSkills} forceExpanded={isSearching}>
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
                      isSelected={selectedUserSkillId === skill.skillId}
                      onSelect={onUserSelect ?? (() => undefined)}
                      isEnabled={skill.enabled}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            </>
          ) : null}

          {hasBuiltIns && userSkills.length > 0 ? (
            <>
              {hasUserGroups ? <SectionDivider /> : null}
              <SkillsCollapsibleSection title={text.builtInSkills} forceExpanded={isSearching}>
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
      );

    return (
      <div
        className="flex h-full min-h-0 flex-1 flex-col pt-1"
        data-official-source="c5e558aae:Ar vt overlay"
      >
        <header className="flex min-w-0 shrink-0 items-center gap-x-sm">
          <div className="flex min-w-0 flex-1 items-center">
            <h2 className="min-w-0 truncate text-title font-semibold text-primary">{text.skills}</h2>
          </div>
          <div className="flex w-full max-w-md shrink-0 justify-center px-md">
            {/* Official c5e558aae n3VpmrDQYa placeholder="Search skills and plugins" */}
            <OfficialTextInput
              aria-label={text.searchSkillsAndPlugins}
              className="w-full"
              data-testid="customize-header-search"
              onValueChange={setSearchQuery}
              placeholder={text.searchSkillsAndPlugins}
              prepend={<Icon className="text-muted" customSize={16} name="Search" />}
              size="sm"
              type="search"
              value={searchQuery}
            />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end">
            {wiggleEnabled ? (
              <AddSkillDropdown
                onBrowseSkills={onBrowseSkills}
                onCreateWithClaude={onCreateWithClaude}
                onWriteInstructions={onWriteInstructions}
                onUpload={onUpload}
                variant="overlay"
              />
            ) : null}
          </div>
        </header>
        <div aria-hidden="true" className="h-4 shrink-0" />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-sm">
          <Tabs.Root value="mine">
            <Tabs.List aria-label={text.skills} className="flex items-center font-sans">
              <Tabs.Tab
                className={OVERLAY_SKILLS_TAB_CLASS}
                data-testid="skills-tabbed-list-tab-mine"
                value="mine"
              >
                {text.yourSkills}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.Root>
        </div>
        <div className="relative -mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto pb-lg pt-1">
          {overlayList}
        </div>
      </div>
    );
  }

  return (
    <ConnectorsPageSidebar title={title} headerAction={headerAction}>
      {listBody}
    </ConnectorsPageSidebar>
  );
}

function SectionDivider() {
  return <hr className="border-t border-border-300 my-2" />;
}

/**
 * Official $e (c27f32a39) first-run card — gcU7Ur/D71 / w39ST2SJHc / ObjectPaperAirplane.
 * onBrowseShared is void in overlay Ar `$t`, so no Discover button (screenshot).
 */
function SkillsOverlayFirstRun() {
  const text = useI18nText(SKILLS_SIDEBAR_MESSAGES);
  return (
    <div
      className="group/card relative isolate flex shrink-0 flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-['']"
      data-cds="Card"
      data-official-source="c27f32a39:$e"
      data-testid="tabbed-list-first-run"
    >
      <span
        aria-hidden="true"
        className="cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit] bg-neutral"
      />
      <div
        className="cds-card-body flex min-h-0 flex-1 flex-col self-stretch rounded-[inherit] p-lg [align-items:inherit] [gap:inherit] [justify-content:inherit]"
        data-cds-card-body=""
      >
        <div className="flex items-center gap-lg">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-md">
            <div className="flex flex-col gap-xs">
              <h3 className="m-0 text-heading-semibold text-primary">{text.addYourFirstSkills}</h3>
              <p className="m-0 text-body text-secondary">{text.skillsTeachClaude}</p>
            </div>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 pr-6 text-primary sm:block">
            <ObjectPaperAirplane />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Official ql — empty only when both user + built-in lists are empty. */
function SkillsListEmptyState({ wiggleEnabled, onAddSkill }: { wiggleEnabled: boolean; onAddSkill: () => void }) {
  const text = useI18nText(SKILLS_SIDEBAR_MESSAGES);
  const intro = text.addSkillsToExtend.replace(/\s*<link>[\s\S]*?<\/link>\s*/g, "").trim();
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col gap-6 items-center">
        <p className="font-small text-text-300 text-center px-6 text-pretty">
          {intro}{" "}
          <a
            href="https://support.claude.com/en/articles/12512198-creating-custom-skills"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-text-100"
          >
            {text.learnMore}
          </a>
        </p>
        {wiggleEnabled ? (
          <button
            type="button"
            onClick={onAddSkill}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-text-000 px-3 text-sm text-bg-000 hover:opacity-90"
          >
            {text.addSkill}
          </button>
        ) : null}
      </div>
    </div>
  );
}
