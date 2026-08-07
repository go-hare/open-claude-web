/**
 * Official b6e residual (index-BELzQL5P):
 *   rich (type ≠ Code/Markdown, content defined, !showRaw) → g6e RichSandbox
 *   Code || showRaw → code surface
 *   Markdown → markdown document surface
 *
 * Product: rich → OfficialRichSandbox; Code/Markdown → plain residual-aligned text
 * (no invent Pierre highlighter / local React preview).
 */

import { memo, useRef } from "react";
import {
  isOfficialRichSandboxType,
  OFFICIAL_XM,
} from "./officialSandboxConstants";
import {
  OfficialRichSandbox,
  type OfficialRichSandboxHandle,
} from "./OfficialRichSandbox";

export type OfficialArtifactSandboxBodyProps = {
  content?: string;
  type?: string;
  language?: string;
  title?: string;
  showRaw?: boolean;
  className?: string;
  onReportError?: (error: unknown) => void;
};

export const OfficialArtifactSandboxBody = memo(
  function OfficialArtifactSandboxBody({
    content,
    type,
    language,
    title,
    showRaw = false,
    className,
    onReportError,
  }: OfficialArtifactSandboxBodyProps) {
    const richSandboxRef = useRef<OfficialRichSandboxHandle | null>(null);
    const isRich =
      content != null &&
      type != null &&
      isOfficialRichSandboxType(type) &&
      !showRaw;
    const showRich = isRich;

    // Residual b6e: rich branch always mounts g6e (hidden when !N); product mounts only when visible.
    if (showRich) {
      return (
        <div
          className={
            className ??
            "h-full w-full relative border-none ease-out duration-200"
          }
          data-official-source="index-BELzQL5P.js:b6e rich→g6e"
        >
          <OfficialRichSandbox
            ref={richSandboxRef}
            className="h-full w-full border-none bg-bg-100"
            content={content}
            type={type}
            title={title}
            onReportError={onReportError}
          />
        </div>
      );
    }

    if (content == null || type == null) return null;

    // Code / raw: residual y6e uses highlighter; product keeps plain pre (no invent).
    if (type === OFFICIAL_XM.Code || showRaw) {
      return (
        <div
          className={
            className ??
            "relative flex w-full flex-1 overflow-x-auto overflow-y-scroll ease-out duration-200"
          }
          data-official-source="index-BELzQL5P.js:b6e code/raw"
        >
          <pre className="code-block__code !my-0 h-fit min-h-full w-fit min-w-full !rounded-none !text-sm !leading-relaxed p-3.5 m-0 whitespace-pre">
            {content}
          </pre>
          {language ? (
            <span className="sr-only">{language}</span>
          ) : null}
        </div>
      );
    }

    // Markdown: residual v6e uses document markdown; product plain prose pre for now.
    if (type === OFFICIAL_XM.Markdown) {
      return (
        <div
          className={
            className ??
            "relative flex w-full flex-1 overflow-x-auto overflow-y-scroll ease-out duration-200"
          }
          data-official-source="index-BELzQL5P.js:b6e markdown"
        >
          <div
            id="markdown-artifact"
            tabIndex={0}
            className="font-claude-response mx-auto w-full max-w-3xl leading-[1.65rem] px-6 pt-4 md:pt-6 md:px-11"
          >
            <pre className="whitespace-pre-wrap m-0 font-inherit text-inherit">
              {content}
            </pre>
            <div className="h-8" />
          </div>
        </div>
      );
    }

    // Unknown non-rich: fall back to raw text
    return (
      <pre className="p-3.5 m-0 whitespace-pre-wrap text-sm text-text-200 overflow-auto">
        {content}
      </pre>
    );
  },
);

OfficialArtifactSandboxBody.displayName = "OfficialArtifactSandboxBody";
