import type { ReactNode } from "react";

/**
 * Official c63a78ed4 vt — list row used for Built-in skills (and shared connectors-style lists).
 */
export function SkillsListItem({
  action,
  className,
  description,
  icon,
  id,
  isEnabled = true,
  isSelected,
  name,
  onSelect,
  statusLabel,
}: {
  /** Official vt `action` — caret when a skill has multiple files. */
  action?: ReactNode;
  className?: string;
  description?: string;
  icon: ReactNode;
  id: string;
  isEnabled?: boolean;
  isSelected: boolean;
  name: string;
  onSelect: (id: string) => void;
  /** Official vt `statusLabel` — spinner while skill files load. */
  statusLabel?: ReactNode;
}) {
  const rowClass = [
    "rounded-lg text-sm transition-colors w-full",
    isSelected ? "bg-bg-300" : "hover:bg-bg-200",
    isEnabled ? "text-text-100" : "text-text-500",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className={["flex-shrink-0 flex items-center justify-center size-6 text-text-300", isEnabled ? "" : "opacity-50"].join(" ")}>
        {icon}
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={["truncate", isSelected ? "font-semibold" : ""].join(" ")}>{name}</span>
        </span>
        {description ? <span className="font-small text-text-400 truncate">{description}</span> : null}
      </div>
      {statusLabel ? <div className="shrink-0">{statusLabel}</div> : null}
    </>
  );

  if (action) {
    return (
      <div className={["flex items-center gap-1 pr-3", rowClass].join(" ")}>
        <button
          type="button"
          aria-current={isSelected ? "true" : undefined}
          onClick={() => onSelect(id)}
          className="flex flex-1 items-center gap-3 px-3 py-1.5 rounded-lg text-left min-w-0 cursor-pointer"
        >
          {body}
        </button>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={() => onSelect(id)}
      className={[rowClass, "flex items-center gap-3 px-3 py-1.5 text-left min-w-0 cursor-pointer"].join(" ")}
    >
      {body}
    </button>
  );
}
