/**
 * Official SendUserFile chat card body (ion-dist pin 2.31226.1).
 *
 * Header verb is already `gcuDcHiCz7` "Sent" (`c52b02f3f` / Zg) — this file is
 * the expanded **tile**, not the verb and not the generic `ix` key dump.
 *
 * Paint residual `cc1aae219-CPC-WA-x.js`:
 * - image: `rL` → `ac.Image` (`shared-2` `Sf`) `data-testid="delivered-image-tile"`
 *   `data-cds="MessageAttachmentsImage"` on `group/tile` 7.5rem card
 * - generic file: `lR` / `_R` → `X_` (`c89efce1a` `Ht`/`Vt`) artifact-block +
 *   `data-testid="file-card-open"`
 * - wrap: `nL` / `Rf` `data-cds="MessageAttachments"` `flex w-full flex-wrap gap-xs justify-start`
 *
 * Open: optional `onOpenPath` (coordinator `actions.openFile`). No invented IPC.
 */
import { type ReactNode } from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  officialSendUserFileBasename,
  parseOfficialSendUserFileCard,
  type OfficialSendUserFileAttachment,
  type OfficialSendUserFileToolLike,
} from "./officialSendUserFile";

const TILE_FRAME = "[--cds-ring-color:var(--cds-border-strong)] [--cds-ring-inner:var(--cds-ring-hairline)] [--cds-ring-outer:0px]";
const TILE_ROOT = "group/tile relative isolate size-[calc(7.5rem*var(--cds-rem-scale,1))] shrink-0 rounded-card outline-none focus-visible:shadow-focus";
const ARTIFACT_ROOT = "group/artifact-block relative flex text-left font-sans rounded-lg overflow-hidden border-0.5 transition duration-300 w-full hover:bg-bg-000/50 px-4 border-border-300 hover:border-border-200";

export function OfficialSendUserFileCard({
  onOpenPath,
  tool,
}: {
  onOpenPath?: (path: string) => void;
  tool: OfficialSendUserFileToolLike;
}): ReactNode | null {
  const model = parseOfficialSendUserFileCard(tool);
  if (!model) return null;

  const images = model.files.filter((file) => file.previewUrl && file.unavailableText === undefined);
  const rest = model.files.filter((file) => !(file.previewUrl && file.unavailableText === undefined));

  return (
    <div className="flex flex-col gap-2" data-official-source="cda39216a-D3Qyl2y1.js k()+o() cc1aae219-CPC-WA-x.js rL/lR">
      {model.caption ? (
        <p className="truncate text-caption font-normal text-secondary">{model.caption}</p>
      ) : null}
      {images.length > 0 ? (
        <div
          className="flex w-full flex-wrap gap-xs justify-start"
          data-cds="MessageAttachments"
          data-thumbnail-height=""
        >
          {images.map((file) => (
            <DeliveredImageTile file={file} key={file.path} onOpenPath={onOpenPath} />
          ))}
        </div>
      ) : null}
      {rest.map((file) => (
        <DeliveredFileTile file={file} key={file.path} onOpenPath={onOpenPath} />
      ))}
    </div>
  );
}

function DeliveredImageTile({
  file,
  onOpenPath,
}: {
  file: OfficialSendUserFileAttachment;
  onOpenPath?: (path: string) => void;
}) {
  const name = officialSendUserFileBasename(file.path);
  const open = onOpenPath ? () => onOpenPath(file.path) : undefined;
  return (
    <div
      className={TILE_ROOT}
      data-cds="MessageAttachmentsImage"
      data-testid="delivered-image-tile"
      tabIndex={-1}
      title={file.path}
    >
      <div className={`size-full ${TILE_FRAME} shadow-field-drop`}>
        {open ? (
          <button className="block size-full cursor-zoom-in" onClick={open} type="button">
            <DeliveredImageMedia alt={name} src={file.previewUrl!} />
            <span className="sr-only">{name}</span>
          </button>
        ) : (
          <DeliveredImageMedia alt={name} src={file.previewUrl!} />
        )}
      </div>
    </div>
  );
}

function DeliveredImageMedia({ alt, src }: { alt: string; src: string }) {
  return (
    <img
      alt={alt}
      className="absolute inset-0 block size-full rounded-card object-contain transition-opacity duration-base motion-reduce:transition-none opacity-100"
      decoding="async"
      height={120}
      loading="lazy"
      src={src}
      width={120}
    />
  );
}

function DeliveredFileTile({
  file,
  onOpenPath,
}: {
  file: OfficialSendUserFileAttachment;
  onOpenPath?: (path: string) => void;
}) {
  const name = officialSendUserFileBasename(file.path);
  const ext = fileExt(name);
  const open = onOpenPath ? () => onOpenPath(file.path) : undefined;
  const faded = file.unavailableText !== undefined;
  return (
    <div className={`${ARTIFACT_ROOT}${faded ? " opacity-50" : ""}`} title={file.path}>
      {open ? (
        <button
          className="absolute inset-0 z-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-200"
          data-testid="file-card-open"
          onClick={open}
          type="button"
        >
          <span className="sr-only">{name}</span>
        </button>
      ) : null}
      <div className="artifact-block-cell flex flex-1 justify-between w-full">
        <div className="flex flex-1 gap-2 min-w-0">
          <div className="flex flex-col gap-1 py-4 min-w-0 flex-1">
            <div className="leading-tight text-sm line-clamp-1">{name}</div>
            <div className="text-xs line-clamp-1 text-text-400">
              {file.caption ?? (ext ? ext.toUpperCase() : null)}
            </div>
          </div>
        </div>
        {open ? (
          <div className="relative z-[1] flex shrink-0 items-center pointer-events-none has-[button]:ms-md [&_button]:pointer-events-auto">
            <OfficialButton ariaLabel={name} icon="Download" onClick={open} size="small" variant="contained" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1) : "";
}
