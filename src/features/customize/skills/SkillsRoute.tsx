import { useCallback, useMemo, useState } from "react";
import { SKILLS_ENABLED } from "../customizeGates";
import { BuiltInSkillDetailPanel } from "./BuiltInSkillDetailPanel";
import { SkillsPageSidebar } from "./SkillsPageSidebar";
import type { SkillsSelection, UserSkill } from "./skillTypes";
import { useBuiltInSkills } from "./useBuiltInSkills";

/**
 * Official c63a78ed4 $l Skills route:
 * loading skeleton → empty full-page OR list sidebar + detail pane.
 * Built-ins from aRe (host getSupportedCommands scope=cowork) gated by Ua (task/cowork mode).
 * Add skill affordances gated by Da().isAvailable (wiggle/code execution) — local: SKILLS_ENABLED.
 */
export function SkillsRoute({
  onBrowseSkills,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
  onTryInCowork,
}: {
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
  onTryInCowork?: (skillName: string) => void;
}) {
  // User/org skills (JLe / list-skills) — not yet wired to org API in local shell.
  const userSkills = useMemo<UserSkill[]>(() => [], []);
  const { builtInSkills, isLoading } = useBuiltInSkills();
  // Official Da().isAvailable — code execution / file creation for skill use.
  const wiggleEnabled = SKILLS_ENABLED;
  const [selection, setSelection] = useState<SkillsSelection>(null);

  const selectedBuiltIn = useMemo(() => {
    if (selection?.kind !== "builtin") return null;
    return builtInSkills.find((skill) => skill.name === selection.name) ?? null;
  }, [builtInSkills, selection]);

  const selectedBuiltInName = selection?.kind === "builtin" ? selection.name : null;

  const onBuiltInSelect = useCallback((name: string) => {
    setSelection({ kind: "builtin", name });
  }, []);

  if (isLoading) {
    return <SkillsLoadingSkeleton />;
  }

  const isGlobalEmpty = userSkills.length === 0 && builtInSkills.length === 0;

  if (isGlobalEmpty) {
    return (
      <div className="flex h-full w-full items-center justify-center">
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
              onClick={onBrowseSkills}
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
      <SkillsPageSidebar
        userSkills={userSkills}
        builtInSkills={builtInSkills}
        selectedBuiltInName={selectedBuiltInName}
        onBuiltInSelect={onBuiltInSelect}
        onBrowseSkills={onBrowseSkills}
        onCreateWithClaude={onCreateWithClaude}
        onWriteInstructions={onWriteInstructions}
        onUpload={onUpload}
        wiggleEnabled={wiggleEnabled}
      />
      <div tabIndex={-1} className="flex-1 overflow-y-auto bg-bg-100 focus-visible:outline-none">
        {selectedBuiltIn ? (
          <BuiltInSkillDetailPanel skill={selectedBuiltIn} onTryInCowork={onTryInCowork} />
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
