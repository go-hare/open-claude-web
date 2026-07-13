/**
 * Official Dc (Button) class maps from c5f4e1303 / index-BELzQL5P LC/NC.
 * Fill variants use official CSS modules: _fill_10ocf_*, _primary_*, etc.
 */

const buttonBase =
  "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none";

const variantChrome: Record<"primary" | "secondary" | "ghost" | "danger" | "claude", string> = {
  primary:
    "font-base-bold overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] backface-hidden after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,hsla(var(--bg-000)/20%),hsla(var(--bg-000)/0%))] after:opacity-0 after:transition after:duration-200 after:translate-y-2 hover:after:opacity-100 hover:after:translate-y-0",
  secondary: "font-base-bold border-0.5 overflow-hidden transition duration-100 backface-hidden",
  ghost: "border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)]",
  danger: "font-base-bold transition hover:scale-y-[1.015] hover:scale-x-[1.005] hover:opacity-95",
  claude: "font-base-bold transition-colors",
};

const sizeChrome: Record<
  "default" | "sm" | "lg" | "icon" | "icon_xs" | "icon_sm" | "icon_lg" | "icon_fit",
  string
> = {
  default: "h-9 px-4 py-2 rounded-lg min-w-[5rem] whitespace-nowrap",
  sm: "h-8 rounded-md px-3 min-w-[4rem] whitespace-nowrap !text-xs",
  lg: "h-11 rounded-[0.6rem] px-5 min-w-[6rem] whitespace-nowrap !text-base",
  icon: "h-9 w-9 rounded-md shrink-0",
  icon_xs: "h-6 w-6 rounded-md",
  icon_sm: "h-8 w-8 rounded-md",
  icon_lg: "h-11 w-11 rounded-[0.6rem]",
  icon_fit: "rounded-md",
};

const fillModule: Record<"primary" | "secondary" | "ghost" | "danger" | "claude", string> = {
  primary: "_fill_10ocf_9 _primary_10ocf_44",
  secondary: "_fill_10ocf_9 _secondary_10ocf_72",
  ghost: "_fill_10ocf_9 _ghost_10ocf_96",
  danger: "_fill_10ocf_9 _danger_10ocf_131",
  claude: "_fill_10ocf_9 _claude_10ocf_159",
};

export type OfficialButtonVariant = keyof typeof variantChrome;
export type OfficialButtonSize = keyof typeof sizeChrome;

export function officialButtonClass({
  variant = "primary",
  size = "default",
  className,
  loading,
}: {
  variant?: OfficialButtonVariant;
  size?: OfficialButtonSize;
  className?: string;
  loading?: boolean;
} = {}): string {
  return [
    buttonBase,
    variantChrome[variant],
    sizeChrome[size],
    fillModule[variant],
    loading ? "!text-transparent ![text-shadow:_none]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Convenience: default-size primary (legacy export used across settings/shell). */
export const primaryButtonClass = officialButtonClass({ variant: "primary", size: "default" });

/** Convenience: default-size secondary. */
export const secondaryButtonClass = officialButtonClass({ variant: "secondary", size: "default" });

/** Convenience: ghost icon_sm (sort/filter/close). */
export const ghostIconSmButtonClass = officialButtonClass({ variant: "ghost", size: "icon_sm" });

/** Convenience: primary sm (CYt 新任务). */
export const primarySmButtonClass = officialButtonClass({ variant: "primary", size: "sm" });
