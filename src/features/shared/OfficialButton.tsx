/**
 * Official Dc / LC Button (c5f4e1303).
 * Class maps from NC + fill modules _fill_10ocf_*.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  officialButtonClass,
  type OfficialButtonSize,
  type OfficialButtonVariant,
} from "./buttonClasses";

export type OfficialButtonProps = {
  append?: ReactNode;
  children?: ReactNode;
  className?: string;
  loading?: boolean;
  prepend?: ReactNode;
  size?: OfficialButtonSize;
  variant?: OfficialButtonVariant;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size">;

export function OfficialButton({
  append,
  children,
  className,
  disabled,
  loading,
  prepend,
  size = "default",
  type = "button",
  variant = "primary",
  ...rest
}: OfficialButtonProps) {
  return (
    <button
      className={officialButtonClass({ variant, size, className, loading })}
      data-official-source="c5f4e1303:LC/NC Dc"
      disabled={disabled || loading}
      type={type}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center _loadingSpinner_10ocf_187"
        >
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80" />
        </span>
      ) : null}
      {prepend}
      {children}
      {append}
    </button>
  );
}
