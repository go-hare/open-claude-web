import { memo, type CSSProperties } from "react";

/**
 * Gutter utility for package FileDiff `renderGutterUtility`.
 * Shell chrome (className / Plus icon) matches Desktop Code Diff control.
 */

/** Official Od (also applied by pierre slot as GutterUtilitySlotStyles; button keeps Od too). */
const OFFICIAL_GUTTER_UTILITY_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  textAlign: "center",
};

/** Official Phosphor PlusIcon bold path (vendor-CmVPl-QA RJ bold). */
function OfficialPlusBoldIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="currentColor"
      viewBox="0 0 256 256"
      aria-hidden="true"
    >
      <path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z" />
    </svg>
  );
}

export type OfficialDiffHoveredLine = {
  lineNumber: number;
  side?: "additions" | "deletions";
};

/**
 * Official `xc` — gutter “Add a comment on this line” control.
 * onAdd is the Fc `$` staging hook; callers may pass a no-op until annotation store is ported.
 */
export const OfficialDiffGutterUtility = memo(function OfficialDiffGutterUtility({
  getHoveredLine,
  onAdd,
}: {
  getHoveredLine: () => OfficialDiffHoveredLine | undefined;
  onAdd: (lineNumber: number, side: "additions" | "deletions" | undefined) => void;
}) {
  return (
    <button
      type="button"
      style={OFFICIAL_GUTTER_UTILITY_STYLE}
      className="flex size-5 my-auto items-center justify-center rounded-r2 bg-t3 text-t9 hover:bg-t5"
      aria-label="Add a comment on this line"
      onClick={() => {
        const line = getHoveredLine();
        if (line) onAdd(line.lineNumber, line.side);
      }}
    >
      <OfficialPlusBoldIcon size={12} />
    </button>
  );
});
