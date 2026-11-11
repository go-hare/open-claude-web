/**
 * Official c7146e7f4 `F` (`vs`): inline shell output.
 * ANSI SGR becomes spans; other control sequences are omitted.
 * No ANSI and a unified diff → git added/removed line backgrounds.
 */
import { Fragment, useMemo } from "react";
import { officialShellOutputSegments } from "./officialAnsiText";

export function OfficialShellOutputText({
  children,
  command,
}: {
  children: string;
  /** Official `_s(command)` — word-diff vs line diff. Ignored when the output has ANSI. */
  command?: string | null;
}) {
  const segments = useMemo(() => officialShellOutputSegments(children, command), [children, command]);
  if (!segments) return <>{children}</>;
  return (
    <Fragment>
      {segments.map((segment, index) =>
        segment.style ? (
          <span
            data-code-line-group={segment.style.display === "block" ? "" : undefined}
            key={index}
            style={segment.style}
          >
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </Fragment>
  );
}
