import type { BuiltInSkill } from "./skillTypes";

/**
 * Official c4b3fcffc BuiltInSkillDetailPanel / CustomizeDetailPanel shell:
 * name, Added by Anthropic, description, Try in Cowork.
 */
export function BuiltInSkillDetailPanel({
  skill,
  hideTryButton = false,
  onTryInCowork,
}: {
  skill: BuiltInSkill;
  hideTryButton?: boolean;
  onTryInCowork?: (skillName: string) => void;
}) {
  const hasMeta = true;
  return (
    <div className="flex flex-col h-full px-6 pb-6 gap-2">
      <div className="flex items-start justify-between pt-4 pb-3 min-h-14">
        <div className="flex-1 min-w-0">
          <h2 className="font-large-bold text-text-100 truncate">{skill.name}</h2>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex flex-col gap-1">
          <span className="font-small text-text-500">Added by</span>
          <span className="font-base text-text-100">Anthropic</span>
        </div>
      </div>

      {skill.description ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-0.5">
            <h3 className="font-small text-text-500 leading-4">Description</h3>
          </div>
          <p className="font-base text-text-300 whitespace-pre-wrap" title="Claude uses these descriptions when deciding which skills to use in chat.">
            {skill.description.replace(/\\n/g, "\n")}
          </p>
        </div>
      ) : null}

      {hasMeta ? (
        <div className="flex items-center h-8">
          <hr className="flex-1 border-border-300" />
        </div>
      ) : null}

      {!hideTryButton ? (
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => onTryInCowork?.(skill.name)}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border-300 bg-bg-000 px-3 text-sm text-text-100 hover:bg-bg-100"
          >
            Try in Cowork
          </button>
        </div>
      ) : null}
    </div>
  );
}
