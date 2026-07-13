/**
 * Official M4t / bF empty state (index-BELzQL5P), variant="projects" → Kq pictogram.
 * Cowork description branch from c1b9abf13 _Component32 (C=true).
 */
import type { ReactNode } from "react";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "../shared/OfficialButton";
import { ProjectsEmptyPictogram } from "./ProjectsEmptyPictogram";

export type ProjectsEmptyStateProps = {
  className?: string;
  ctaLabel?: ReactNode;
  description?: ReactNode;
  headline?: ReactNode;
  onCtaClick?: () => void;
};

export function ProjectsEmptyState({
  className = "mt-8",
  ctaLabel = "New project",
  description = "Point Claude at a folder on your machine and work on it together.",
  headline = "Looking to start a project?",
  onCtaClick,
}: ProjectsEmptyStateProps) {
  return (
    <div
      className={["flex flex-col items-center justify-center text-center py-12 px-4 text-md", className]
        .filter(Boolean)
        .join(" ")}
      data-official-source="index-BELzQL5P.js:M4t"
    >
      <ProjectsEmptyPictogram size="medium" />
      {headline ? <h3 className="text-text-200 font-medium mb-2 mt-4">{headline}</h3> : null}
      {description ? <p className="text-text-200 text-sm mb-4 max-w-sm mt-2">{description}</p> : null}
      {ctaLabel && onCtaClick ? (
        <OfficialButton className="mt-2" onClick={onCtaClick} prepend={<Icon customSize={16} name="Add" />} variant="secondary">
          {ctaLabel}
        </OfficialButton>
      ) : null}
    </div>
  );
}
