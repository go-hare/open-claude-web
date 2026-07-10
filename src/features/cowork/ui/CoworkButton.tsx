import type { ReactNode } from "react";
import { Icon } from "../../../shell/icons";

type CoworkButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  customIcon?: ReactNode;
  disabled?: boolean;
  icon?: string;
  mode?: "text" | "icon";
  onClick?: () => void;
  pressed?: boolean;
  size?: "small" | "base" | "large";
  type?: "button" | "submit";
  variant?: "uncontained" | "contained" | "primary" | "destructive" | "toggle" | "accent" | "link" | "muted";
};

const variantClasses: Record<NonNullable<CoworkButtonProps["variant"]>, string> = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled busy:text-contained-busy pressed:text-contained-selected pressed:hover:text-contained-selected ring-focus",
  primary: "text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary",
  destructive: "text-destructive-default hover:text-destructive-hover disabled:text-destructive-disabled disabled:hover:text-destructive-disabled busy:text-destructive-busy ring-focus-destructive",
  toggle: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-[var(--accent)] pressed:hover:text-[var(--accent-hover)] ring-focus",
  accent: "text-[var(--accent)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  link: "text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  muted: "text-t6 hover:text-t7 disabled:text-t4 disabled:hover:text-t4 busy:text-t4 pressed:text-t7 pressed:hover:text-t7 ring-focus",
};

const sizeClasses = {
  small: "h-small text-footnote rounded-small",
  base: "h-base text-body rounded-base",
  large: "h-large text-heading rounded-large",
};

const textPadding = { small: "px-p5", base: "px-p6", large: "px-p7" };

const backgroundClasses: Record<NonNullable<CoworkButtonProps["variant"]>, string> = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)] group-pressed/btn:bg-[var(--fill-uncontained-selected)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/btn:bg-[var(--fill-contained-hover)] group-disabled/btn:bg-[var(--fill-contained-disabled)] group-pressed/btn:bg-[var(--fill-contained-selected)] effect-contained-default group-disabled/btn:shadow-none",
  primary: "bg-[var(--fill-primary-default)] group-hover/btn:bg-[var(--fill-primary-hover)] group-disabled/btn:bg-[var(--fill-primary-disabled)] effect-primary-default group-disabled/btn:shadow-none",
  destructive: "bg-[var(--fill-destructive-default)] group-hover/btn:bg-[var(--fill-destructive-hover)] group-disabled/btn:bg-[var(--fill-destructive-disabled)]",
  toggle: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)]",
  accent: "bg-[var(--accent-10)] group-hover/btn:bg-[var(--accent-20)]",
  link: "bg-transparent",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]",
};

export function CoworkButton({ ariaLabel, children, className, customIcon, disabled, icon, mode = children ? "text" : "icon", onClick, pressed, size = "base", type = "button", variant = "uncontained" }: CoworkButtonProps) {
  const modeClass = mode === "icon" ? "justify-center aspect-square px-p3" : `gap-g3 ${textPadding[size]}`;
  return (
    <button aria-label={ariaLabel} aria-pressed={pressed || undefined} className={["group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring", variantClasses[variant], sizeClasses[size], modeClass, className ?? ""].join(" ")} disabled={disabled} onClick={onClick} type={type}>
      <span aria-hidden="true" className={`btn-squish absolute inset-0 -z-[1] rounded-[inherit] ${backgroundClasses[variant]}`} />
      {customIcon ?? (icon ? <Icon name={icon} size={size === "small" ? "xs" : size === "large" ? "md" : "sm"} /> : null)}
      {children}
    </button>
  );
}
