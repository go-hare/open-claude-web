import type { ReactNode } from "react";

/**
 * Official c63a78ed4 vt — list row used for Built-in skills (and shared connectors-style lists).
 */
export function SkillsListItem({
  id,
  name,
  icon,
  isSelected,
  onSelect,
  description,
  isEnabled = true,
  className,
}: {
  id: string;
  name: string;
  icon: ReactNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  description?: string;
  isEnabled?: boolean;
  className?: string;
}) {
  const rowClass = [
    "rounded-lg text-sm transition-colors w-full",
    isSelected ? "bg-bg-300" : "hover:bg-bg-200",
    isEnabled ? "text-text-100" : "text-text-500",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(id)}
      className={[rowClass, "flex items-center gap-3 px-3 py-1.5 text-left min-w-0 cursor-pointer"].join(" ")}
    >
      <span className={["flex-shrink-0 flex items-center justify-center size-6 text-text-300", isEnabled ? "" : "opacity-50"].join(" ")}>
        {icon}
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={["truncate", isSelected ? "font-semibold" : ""].join(" ")}>{name}</span>
        </span>
        {description ? <span className="font-small text-text-400 truncate">{description}</span> : null}
      </div>
    </button>
  );
}
