import type { CSSProperties } from "react";

/**
 * Official lucide `Nx` wrapper (c5f4e1303) + index-BELzQL5P paths used by
 * Code recents overflow (`Xy` via `fZt`) and message rating (`dC`/`cC` via Vv).
 * Same size map as CoworkOfficialGlyphs (`Ix`: 12/14→16, 16/20→20).
 */
type LucideGlyphSize = 12 | 14 | 16 | 20 | 24 | 28 | 32;

type OfficialLucideGlyphProps = {
  alt?: string;
  className?: string;
  size?: LucideGlyphSize;
  vectorSizeOverride?: number;
};

const vectorSizes: Record<LucideGlyphSize, number> = {
  12: 16,
  14: 16,
  16: 20,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
};

/** Official index-BELzQL5P `dC` (Vv Good response `Cs`). */
const thumbsUpPath =
  "M9.56 2a2.5 2.5 0 0 1 2.452 2.99L11.609 7h2.235a2.75 2.75 0 0 1 2.713 3.202l-.681 4.082A3.25 3.25 0 0 1 12.67 17H4.5A1.5 1.5 0 0 1 3 15.5V9.238a1.5 1.5 0 0 1 1.059-1.433l1.14-.35.139-.048a2.75 2.75 0 0 0 1.56-1.453L8.41 2.59l.07-.13A1 1 0 0 1 9.322 2zM7.81 6.365a3.75 3.75 0 0 1-2.126 1.98l-.192.065-1.14.35A.5.5 0 0 0 4 9.239V15.5a.5.5 0 0 0 .5.5h8.17a2.25 2.25 0 0 0 2.22-1.88l.68-4.082A1.75 1.75 0 0 0 13.844 8H11a.5.5 0 0 1-.49-.598l.521-2.608A1.5 1.5 0 0 0 9.561 3h-.238z";

/** Official index-BELzQL5P `cC` (Vv Bad response `Ss`). */
const thumbsDownPath =
  "M12.67 3a3.25 3.25 0 0 1 3.206 2.716l.68 4.082A2.75 2.75 0 0 1 13.845 13H11.61l.403 2.01A2.5 2.5 0 0 1 9.56 18h-.238a1 1 0 0 1-.843-.46l-.069-.13-1.514-3.364a2.75 2.75 0 0 0-1.56-1.453l-.139-.047-1.14-.35A1.5 1.5 0 0 1 3 10.761V4.5A1.5 1.5 0 0 1 4.5 3zM4.5 4a.5.5 0 0 0-.5.5v6.262a.5.5 0 0 0 .353.477l1.14.35.19.065a3.75 3.75 0 0 1 2.127 1.98L9.323 17h.238a1.5 1.5 0 0 0 1.47-1.794l-.521-2.608A.5.5 0 0 1 11 12h2.844a1.75 1.75 0 0 0 1.726-2.038l-.68-4.082A2.25 2.25 0 0 0 12.67 4z";

/** Official index-BELzQL5P `Xy` (recents overflow `fZt`). Vertical three dots. */
const dotsVerticalPath =
  "M10 14a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m0-5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3";

/** Official index-BELzQL5P `ky` (cbc59a8af PaneHeaderMenuTrigger `j` size 14). */
const chevronDownPath =
  "M16.134 6.16a.5.5 0 1 1 .732.68l-6.5 7-.077.068a.5.5 0 0 1-.655-.068l-6.5-7-.062-.08a.5.5 0 0 1 .718-.667l.076.067L10 12.767z";

function OfficialLucideGlyph({
  alt,
  className,
  path,
  size = 20,
  vectorSizeOverride,
}: OfficialLucideGlyphProps & { path: string }) {
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
  // Official Nx: className on both the size box and the svg.
  return <div className={className} style={wrapperStyle}>{svg}</div>;
}

export function OfficialThumbsUpGlyph(props: OfficialLucideGlyphProps) {
  return <OfficialLucideGlyph {...props} path={thumbsUpPath} />;
}

export function OfficialThumbsDownGlyph(props: OfficialLucideGlyphProps) {
  return <OfficialLucideGlyph {...props} path={thumbsDownPath} />;
}

export function OfficialDotsVerticalGlyph(props: OfficialLucideGlyphProps) {
  return <OfficialLucideGlyph {...props} path={dotsVerticalPath} />;
}

export function OfficialChevronDownGlyph(props: OfficialLucideGlyphProps) {
  return <OfficialLucideGlyph {...props} path={chevronDownPath} />;
}
