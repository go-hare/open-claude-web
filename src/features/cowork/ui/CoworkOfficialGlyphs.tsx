import type { CSSProperties } from "react";

type CoworkGlyphSize = 12 | 14 | 16 | 20 | 24 | 28 | 32;

type CoworkOfficialGlyphProps = {
  alt?: string;
  className?: string;
  size?: CoworkGlyphSize;
  vectorSizeOverride?: number;
};

const vectorSizes: Record<CoworkGlyphSize, number> = {
  12: 16,
  14: 16,
  16: 20,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
};

const clockPath = "M10.386 2.51A7.5 7.5 0 1 1 2.5 10a.5.5 0 0 1 1 0 6.5 6.5 0 1 0 6.835-6.491L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99zM10 5.5a.5.5 0 0 1 .5.5v3.69l2.724 1.363a.5.5 0 0 1-.353.93l-.095-.036-3-1.5A.5.5 0 0 1 9.5 10V6a.5.5 0 0 1 .5-.5M3.662 6.941a.661.661 0 1 1 0 1.323.661.661 0 0 1 0-1.323m1.294-2.647a.662.662 0 1 1-.001 1.323.662.662 0 0 1 .001-1.323M7.603 3a.662.662 0 1 1-.001 1.325.662.662 0 0 1 0-1.325";
const checkPath = "M10 2.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15m0 1a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13m2.61 3.688a.5.5 0 0 1 .78.625l-4 5a.5.5 0 0 1-.661.107l-.083-.066-2-2-.064-.079a.5.5 0 0 1 .693-.693l.079.064 1.604 1.605z";
const chevronDownPath = "M14.128 7.165a.502.502 0 0 1 .744.67l-4.5 5-.078.07a.5.5 0 0 1-.666-.07l-4.5-5-.06-.082a.501.501 0 0 1 .729-.656l.075.068L10 11.752z";
const collapsePath = "M9.647 12.147a.5.5 0 0 1 .628-.065l.079.064 4 4a.5.5 0 1 1-.707.708L10 13.207l-3.646 3.647a.5.5 0 0 1-.707-.707zm4-9a.5.5 0 1 1 .707.707l-4 4-.079.064a.5.5 0 0 1-.628-.064l-4-4a.5.5 0 1 1 .707-.707L10 6.793z";
const expandPath = "M13.647 12.646a.5.5 0 0 1 .707.707l-4 4-.079.065a.5.5 0 0 1-.628-.065l-4-4a.5.5 0 0 1 .707-.707L10 16.293zm-4-10a.5.5 0 0 1 .628-.064l.079.064 4 4a.5.5 0 0 1-.707.707L10 3.707 6.354 7.353a.5.5 0 1 1-.707-.707z";

export function CoworkTimelineClockGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={clockPath} />;
}

export function CoworkCircleCheckGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={checkPath} />;
}

export function CoworkChevronDownGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={chevronDownPath} />;
}

export function CoworkCollapseGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={collapsePath} />;
}

export function CoworkExpandGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={expandPath} />;
}

function CoworkOfficialGlyph({ alt, className, path, size = 20, vectorSizeOverride }: CoworkOfficialGlyphProps & { path: string }) {
  const vectorSize = vectorSizeOverride ?? vectorSizes[size];
  const svg = (
    <svg
      aria-hidden={!alt}
      aria-label={alt}
      className={className}
      fill="currentColor"
      height={vectorSize}
      style={{ flexShrink: 0 }}
      viewBox="0 0 20 20"
      width={vectorSize}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} />
    </svg>
  );
  if (vectorSizeOverride) return svg;
  const wrapperStyle: CSSProperties = {
    alignItems: "center",
    display: "flex",
    height: size,
    justifyContent: "center",
    width: size,
  };
  return <div className={className} style={wrapperStyle}>{svg}</div>;
}
