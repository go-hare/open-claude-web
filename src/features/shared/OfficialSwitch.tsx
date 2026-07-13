/**
 * Official Zfe switch + lge wrapper (index-BELzQL5P).
 * dsVariant dark used by hYt Keep awake.
 */
import type { InputHTMLAttributes, ReactNode } from "react";

const sizeMap = {
  default: { width: 36, height: 20 },
  small: { width: 28, height: 16 },
} as const;

/** Official Jfe track base */
const trackBase =
  "rounded-full transition-all bg-bg-500 ring-[0.5px] ring-border-200 group-hover/switch:ring-[1px] group-data-[force-hover=true]/switch:ring-[1px] peer-focus-visible:outline peer-focus-visible:outline-[1px] peer-focus-visible:outline-accent-100 peer-focus-visible:outline-offset-2 peer-data-[force-focus=true]:outline peer-data-[force-focus=true]:outline-[1px] peer-data-[force-focus=true]:outline-accent-100 peer-data-[force-focus=true]:outline-offset-2 peer-disabled:opacity-50 peer-disabled:ring-[0px] peer-checked:bg-accent-100 peer-checked:ring-[0px] group-hover/switch:peer-checked:ring-[1px] group-hover/switch:peer-checked:ring-accent-000 group-data-[force-hover=true]/switch:peer-checked:ring-[1px] group-data-[force-hover=true]/switch:peer-checked:ring-accent-000";

/** Official ege.pill.dark */
const trackDark =
  "peer-checked:bg-text-100 group-hover/switch:peer-checked:ring-text-100 group-data-[force-hover=true]/switch:peer-checked:ring-text-100";

/** Official Qfe thumb base */
const thumbBase =
  "absolute flex items-center justify-center start-[2px] top-[2px] rounded-full transition-all ring-[0.5px] ring-inset group-hover/switch:ring-[1px] group-data-[force-hover=true]/switch:ring-[1px] peer-disabled:ring-[0px]";

/** Official ege.circle.default / dark */
const thumbDefault =
  "bg-white ring-border-200 peer-checked:ring-[0px] group-hover/switch:peer-checked:ring-[0px] group-data-[force-hover=true]/switch:peer-checked:ring-[0px]";
const thumbDark =
  "bg-white ring-bg-000 peer-checked:ring-[0.5px] group-hover/switch:peer-checked:ring-[0.5px] group-data-[force-hover=true]/switch:peer-checked:ring-[0.5px] peer-disabled:peer-checked:ring-[0.5px]";

export type OfficialSwitchProps = {
  checked?: boolean;
  children?: ReactNode;
  className?: string;
  disableAnimation?: boolean;
  dsVariant?: "default" | "dark";
  onCheckedChange?: (checked: boolean) => void;
  size?: "default" | "sm" | "small";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange">;

/** Official lge → Zfe */
export function OfficialSwitch({
  checked,
  children,
  className,
  disableAnimation,
  disabled,
  dsVariant = "default",
  id,
  onCheckedChange,
  size = "default",
  ...rest
}: OfficialSwitchProps) {
  const resolvedSize = size === "sm" || size === "small" ? "small" : "default";
  const { width, height } = sizeMap[resolvedSize];
  const widthPx = `${width}px`;
  const heightPx = `${height}px`;
  const thumbPx = `calc(${heightPx} - 4px)`;
  const travel = `calc(${widthPx} - ${heightPx})`;
  const variant = dsVariant === "dark" ? "dark" : "default";

  return (
    <label className="inline-flex" htmlFor={id} data-official-source="index-BELzQL5P.js:lge">
      <div
        className={[
          "group/switch relative select-none cursor-pointer has-[:disabled]:pointer-events-none",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-official-source="index-BELzQL5P.js:Zfe"
      >
        <input
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          id={id}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
          role="switch"
          style={{ width: widthPx, height: heightPx }}
          type="checkbox"
          {...rest}
        />
        <div
          className={[
            trackBase,
            variant === "dark" ? trackDark : "",
            disableAnimation ? "!transition-none" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: widthPx, height: heightPx }}
        />
        <div
          className={[
            thumbBase,
            variant === "dark" ? thumbDark : thumbDefault,
            disableAnimation ? "!transition-none" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            height: thumbPx,
            width: thumbPx,
            transform: `translateX(${checked ? travel : "0"})`,
          }}
        >
          {children}
        </div>
      </div>
    </label>
  );
}
