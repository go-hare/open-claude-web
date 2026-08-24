/**
 * Official Kfe / Gfe inline alert (index-BELzQL5P.js).
 * Gfe: flex w-fit rounded-xl p-3 gap-3 items-start text-sm border-0.5 border-border-200
 *   main / warning / danger variants.
 */
import type { ReactNode } from "react";

const VARIANT_CLASS: Record<"main" | "warning" | "danger", string> = {
  main: "bg-bg-200",
  warning: "text-warning-000 border-warning-200 bg-warning-900",
  danger: "text-danger-000 border-danger-100 bg-danger-900",
};

export function OfficialInlineAlert({
  className,
  icon,
  message,
  variant = "main",
}: {
  className?: string;
  icon?: ReactNode;
  message: ReactNode;
  variant?: "main" | "warning" | "danger";
}) {
  return (
    <div
      className={[
        "flex w-fit rounded-xl p-3 gap-3 items-start text-sm border-0.5 border-border-200",
        VARIANT_CLASS[variant],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-color-context={variant}
    >
      {icon ? <div className="h-8 ml-1 flex items-center">{icon}</div> : null}
      <div className="flex flex-wrap items-start gap-y-1 gap-x-3 flex-1">
        <div className="my-[0.35rem] flex-1 min-w-[min(20ch,100%)]">{message}</div>
      </div>
    </div>
  );
}
