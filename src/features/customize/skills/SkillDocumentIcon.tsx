import type { ReactNode, SVGProps } from "react";

/**
 * Official index-BELzQL5P Vv (exported as gO) — document glyph for Skills nav (E7t I7t size 16)
 * and Built-in skill rows (pb tile + Vv size 16). Paths from official Vv; master viewBox 0 0 20 20.
 * Must not use LightningBoltZap / spark — that is a different icon.
 */
export function SkillDocumentIcon({ size = 16, className, style, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...props}
    >
      <path d="M13.04 7.304a.5.5 0 0 1 .92.392C13.665 8.386 13.089 9 12.3 9c-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.234-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696a.5.5 0 0 1 .92 0c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 3a2 2 0 0 1 2 2v8h1.5a.5.5 0 0 1 .5.5V15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4H4a1 1 0 0 0-.745 1.667.5.5 0 0 1-.745.666A2 2 0 0 1 4 3zM6 15a1 1 0 1 0 2 0v-1.5a.5.5 0 0 1 .5-.5H15V5a1 1 0 0 0-1-1H6zm3 0c0 .365-.1.706-.27 1H16a1 1 0 0 0 1-1v-1H9z"
      />
    </svg>
  );
}

/**
 * Official YG / pb icon tile: size 24, radius 0.27*size, bg-bg-000 border-0.5 shadow-sm.
 */
export function SkillIconTile({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: 0.27 * size }}
      className="shrink-0 bg-bg-000 border-border-300 border-0.5 shadow-sm flex items-center justify-center"
    >
      {children}
    </div>
  );
}
