type OfficialSpinnerSize = "s" | "m" | "l";

export function OfficialSpinner({ animate = true, className = "", inheritColor = false, size = "m" }: { animate?: boolean; className?: string; inheritColor?: boolean; size?: OfficialSpinnerSize }) {
  const config = spinnerConfig(size);
  const color = inheritColor ? "currentColor" : "var(--cds-text-muted, var(--t6))";
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${config.stroke}px), #000 calc(100% - ${config.stroke - 0.5}px))`;
  return (
    <span data-cds="Spinner" className={`relative inline-block shrink-0 align-middle ${className}`} style={{ height: config.box, width: config.box }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: `${config.stroke}px solid var(--cds-border, var(--t2))` }} />
      <span className={`absolute inset-0 rounded-full ${animate ? "animate-[spin_2s_linear_infinite]" : ""}`} style={{ background: `conic-gradient(transparent 40%, ${color})`, WebkitMask: mask, mask }} />
    </span>
  );
}

function spinnerConfig(size: OfficialSpinnerSize) {
  if (size === "s") return { box: 12, stroke: 1.5 };
  if (size === "l") return { box: 20, stroke: 2 };
  return { box: 16, stroke: 1.75 };
}
