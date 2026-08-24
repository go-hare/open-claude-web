/**
 * Official k4t / _4t directory chips (index-BELzQL5P.js).
 */
import type { ReactNode } from "react";

export function DirectoryChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex overflow-x-auto gap-2 p-1 -m-1", className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function DirectoryChip({
  children,
  className,
  disabled,
  isActive,
  onClick,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  size?: "default" | "sm";
}) {
  const classes = [
    size === "sm" ? "font-small px-2 py-1" : "font-base px-4 py-1.5 ",
    "rounded-full shrink-0 flex items-center justify-center",
    disabled ? "cursor-default" : "",
    isActive ? "text-text-100 bg-bg-500" : disabled ? "text-text-500" : "text-text-500 hover:bg-bg-300",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-pressed={!!isActive}
      className={classes}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      {children}
    </button>
  );
}
