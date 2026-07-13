/**
 * Official Yfe checkbox (index-BELzQL5P).
 * Used by uYt "Run at exact time" (disableJitter).
 */
import type { InputHTMLAttributes, ReactNode } from "react";

export type OfficialCheckboxProps = {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  label: ReactNode;
  labelClassName?: string;
  onCheckedChange: (checked: boolean) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type" | "size">;

/** Official Yfe */
export function OfficialCheckbox({
  checked,
  className,
  disabled = false,
  label,
  labelClassName,
  onCheckedChange,
  ...rest
}: OfficialCheckboxProps) {
  return (
    <label
      className={[
        "select-none flex flex-row gap-3 cursor-pointer text-left shrink-0 items-center",
        labelClassName ?? "",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-official-source="index-BELzQL5P.js:Yfe"
    >
      <input
        checked={checked}
        className="sr-only peer"
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        type="checkbox"
        {...rest}
      />
      <div
        className={[
          "shrink-0 w-4 h-4 flex items-center justify-center border rounded transition-colors duration-100 ease-in-out peer-focus-visible:ring-1 ring-offset-2 ring-offset-bg-300 ring-accent-100/70",
          checked ? "bg-accent-100 border-accent-100" : "bg-bg-000 border-border-200 hover:border-border-100",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {checked ? (
          <svg className="text-oncolor-100" fill="none" height={10} viewBox="0 0 12 12" width={10}>
            <path
              d="M2 6.5L4.5 9L10.5 3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        ) : null}
      </div>
      <span className={["leading-none", disabled ? "text-text-500" : ""].filter(Boolean).join(" ")}>
        {label}
      </span>
    </label>
  );
}
