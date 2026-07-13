/**
 * Official txe/sxe Select (index-BELzQL5P) over Base UI Select.
 * Trigger chrome from exe CVA; popup Cde+wde; item kde.
 */
import { Select } from "@base-ui-components/react/select";
import type { ReactNode } from "react";
import { Icon } from "../../shell/icons";

const triggerBase =
  "text-text-100 py-0 transition-colors can-focus cursor-pointer appearance-none w-full flex items-center justify-between text-nowrap disabled:cursor-not-allowed disabled:opacity-50";

const sizeChrome = {
  sm: "h-8 pl-2 pr-1.5 text-sm rounded-md gap-1",
  normal: "h-9 pl-2.5 pr-2 rounded-lg gap-1",
  lg: "h-11 pl-3 pr-2.5 rounded-[0.6rem] gap-1.5",
} as const;

const variantChrome = {
  outline: "bg-bg-000 border border-border-300 enabled:hover:border-border-200 shadow-none",
  ghost: "bg-transparent border-none shadow-none cursor-pointer",
  danger: "bg-danger-900 text-danger-000 shadow border-danger-200 hover:border-danger-200 focus:border-danger-200",
} as const;

/** Official Cde + wde */
const popupChrome =
  "z-dropdown bg-bg-000 border-0.5 border-border-200 backdrop-blur-xl rounded-xl min-w-[8rem] text-text-300 shadow-[0px_2px_8px_0px_hsl(var(--always-black)/8%)] dark:shadow-[0px_2px_8px_0px_hsl(var(--always-black)/24%)] max-h-[min(24rem,var(--available-height))] overflow-y-auto overflow-x-hidden";

/** Official kde */
const itemChrome =
  "font-base min-h-8 px-2 py-1.5 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-2 items-center outline-none select-none data-[highlighted]:bg-bg-300 data-[highlighted]:text-text-000";

export type OfficialSelectOption = {
  label: ReactNode;
  value: string;
};

export type OfficialSelectProps = {
  className?: string;
  displayValue?: ReactNode;
  id?: string;
  onValueChange: (value: string) => void;
  options: OfficialSelectOption[];
  size?: keyof typeof sizeChrome;
  value: string;
  variant?: keyof typeof variantChrome;
};

/** Official txe */
export function OfficialSelect({
  className,
  displayValue,
  id,
  onValueChange,
  options,
  size = "normal",
  value,
  variant = "outline",
}: OfficialSelectProps) {
  const selected = options.find((option) => option.value === value);
  const label = displayValue ?? selected?.label ?? value;

  return (
    <Select.Root
      items={options}
      modal={false}
      onValueChange={(next) => {
        if (typeof next === "string" && next.length > 0) onValueChange(next);
      }}
      value={value}
    >
      <Select.Trigger
        className={[triggerBase, sizeChrome[size], variantChrome[variant], className ?? ""]
          .filter(Boolean)
          .join(" ")}
        data-official-source="index-BELzQL5P.js:txe"
        id={id}
      >
        <span className="truncate">
          <Select.Value>{() => label}</Select.Value>
        </span>
        <Select.Icon className="text-text-500 shrink-0">
          <Icon name="ChevronDownSmall" size={size === "sm" ? "xs" : "sm"} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-dropdown outline-none" sideOffset={4}>
          <Select.Popup className={popupChrome} data-official-source="index-BELzQL5P.js:txe popup">
            <Select.List className="p-1.5">
              {options.map((option) => (
                <Select.Item className={itemChrome} key={option.value} value={option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Icon className="text-accent-100" name="CheckSelection" size="sm" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
