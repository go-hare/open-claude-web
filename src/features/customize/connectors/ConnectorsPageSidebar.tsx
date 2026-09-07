import type { ReactNode } from "react";

/** Official c63a78ed4 Nt width tokens for CustomizePageSidebar (St). */
const SIDEBAR_WIDTH = "w-[280px] min-w-[280px] xl:w-[360px] xl:min-w-[360px]";

/**
 * Official St / CustomizePageSidebar:
 * border-r list column with title row + scroll body (+ optional tabs/footer).
 */
export function ConnectorsPageSidebar({
  title,
  headerAction,
  children,
  contentClassName,
}: {
  title: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className={`border-r border-border-300 flex flex-col h-full overflow-hidden ${SIDEBAR_WIDTH}`}>
      <div className="flex items-center justify-between gap-2 px-6 py-3 min-h-14">
        {typeof title === "string" ? (
          <h2 className="font-large-bold truncate">{title}</h2>
        ) : (
          <div className="flex-1 min-w-0">{title}</div>
        )}
        {headerAction}
      </div>
      <div className={`flex-1 overflow-y-auto px-4 ${contentClassName ?? ""}`}>{children}</div>
    </div>
  );
}
