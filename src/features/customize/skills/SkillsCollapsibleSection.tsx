import { useId, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";

/**
 * Official c63a78ed4 _t — collapsible section header for Skills / Connectors groups.
 */
export function SkillsCollapsibleSection({
  title,
  action,
  children,
  defaultExpanded = true,
  forceExpanded = false,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isOpen = forceExpanded || expanded;
  const panelId = useId();

  return (
    <div>
      <div className="flex items-center justify-between px-2 pb-2">
        <button
          type="button"
          className="flex items-center gap-1.5 cursor-pointer"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200 ease-in-out"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            <Icon name="caretRight" className="text-text-500" size="xs" />
          </span>
          <span className="font-small text-text-500">{title}</span>
        </button>
        {action}
      </div>
      {isOpen ? <div id={panelId}>{children}</div> : null}
    </div>
  );
}
