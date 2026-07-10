import { useState } from "react";
import { Icon } from "../../../../shell/icons";
import { asRecord, stringValue } from "../recordUtils";
import type { CoworkChatMessage, CoworkContentBlock, CoworkFile } from "./coworkMessageModel";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export function CoworkHumanAttachments({ message }: { message: CoworkChatMessage }) {
  const hasAttachments = message.files_v2.length + message.attachments.length + message.sync_sources.length > 0;
  if (!hasAttachments) return null;
  return (
    <div className="gap-2 mx-0.5 mb-3 flex flex-wrap justify-end">
      {message.files_v2.map((file) => <CoworkWiggleFileCard file={file} key={file.file_uuid || file.path} />)}
    </div>
  );
}

export function CoworkHumanImages({ blocks }: { blocks: CoworkContentBlock[] }) {
  const images = blocks.filter((block) => block.type === "image");
  if (images.length === 0) return null;
  return (
    <div className="flex gap-3 flex-wrap justify-end mb-2 max-w-[85%]">
      {images.map((block, index) => <CoworkImageBlock block={block} key={`msg-image-${index}`} />)}
    </div>
  );
}

function CoworkWiggleFileCard({ file }: { file: CoworkFile }) {
  const actions = useCoworkTranscriptActions();
  const extension = file.file_name.includes(".") ? file.file_name.split(".").at(-1) : undefined;
  return (
    <div className="relative">
      <button
        aria-label={file.file_name}
        className="cursor-pointer font-ui transition-all rounded-lg border-0.5 border-border-300/25 flex h-[120px] w-[120px] min-w-[120px] flex-col justify-between gap-2.5 overflow-hidden bg-bg-000 px-2.5 py-2 text-left shadow-sm shadow-always-black/5 hover:border-border-200/50 hover:shadow-always-black/10"
        data-testid={file.file_name}
        onClick={() => actions?.openFile({ path: file.path })}
        type="button"
      >
        <h3 className="text-[12px] break-words text-text-100 line-clamp-4">{file.file_name}</h3>
        {extension ? <span className="min-w-0 h-[18px] self-start flex items-center justify-center px-1 border-0.5 border-border-300/25 shadow-sm rounded bg-bg-000/70 font-medium uppercase text-text-300 text-[11px] leading-[13px]">{extension}</span> : null}
      </button>
    </div>
  );
}

function CoworkImageBlock({ block }: { block: CoworkContentBlock }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const source = asRecord(block.source);
  const sourceType = stringValue(source.type);
  const url = sourceType === "url"
    ? stringValue(source.url)
    : sourceType === "base64" && stringValue(source.data)
      ? `data:${stringValue(source.media_type) ?? "image/png"};base64,${stringValue(source.data)}`
      : undefined;
  if (!url) return null;
  if (sourceType === "url") return <img alt="Uploaded image" className="max-w-full max-h-[320px] rounded-md object-contain" src={url} />;
  return (
    <>
      <div className="inline-flex min-w-0 items-center gap-0 rounded-md border-0.5 border-border-300 text-xs text-text-300 max-w-[200px] shadow-sm shadow-always-black/5">
        <button
          aria-label="Preview image"
          className="inline-flex min-w-0 items-center gap-2 pl-0.5 pr-0.5 py-0.5 hover:opacity-80 transition-opacity flex-1"
          onClick={() => setPreviewOpen(true)}
          type="button"
        >
          <img alt="Uploaded image" className="w-5 h-5 rounded overflow-hidden flex-shrink-0 object-cover" src={url} />
          <span className="truncate flex-1 min-w-0">Image</span>
        </button>
      </div>
      {previewOpen ? <CoworkImagePreview onClose={() => setPreviewOpen(false)} src={url} /> : null}
    </>
  );
}

function CoworkImagePreview({ onClose, src }: { onClose: () => void; src: string }) {
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-always-black/60 draggable-none" onClick={onClose} role="presentation">
      <div className="relative max-w-[40rem] px-3 pb-14 pt-3" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Close image preview" className="absolute left-full top-3 ml-1.5 text-always-white" onClick={onClose} type="button"><Icon customSize={16} name="XCrossCloseMedium" /></button>
        <div className="rounded-md overflow-hidden shadow-[0_4px_32px_hsl(var(--always-black)/30%),_0_0_0_0.5px_hsl(var(--always-black)/25%)]">
          <img alt="Full size preview" className="block w-full max-h-[calc(100vh-4rem)]" onClick={onClose} src={src} />
        </div>
      </div>
    </div>
  );
}
