export type EpitaxyUploadedFile = { fileName: string; fileUuid?: string; path: string };

export function parseEpitaxyUploadedFilesText(text: string) {
  const match = text.match(/<uploaded_files>([\s\S]*?)<\/uploaded_files>/);
  if (!match) return { files: [] as EpitaxyUploadedFile[], text };
  return {
    files: Array.from((match[1] ?? "").matchAll(/<file>([\s\S]*?)<\/file>/g)).flatMap((fileMatch) => {
      const xml = fileMatch[1] ?? "";
      const path = tagValue(xml, "file_path");
      return path ? [{ fileName: basename(path), fileUuid: tagValue(xml, "file_uuid"), path }] : [];
    }),
    text: text.replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "").trim(),
  };
}

function tagValue(xml: string, tag: string) {
  return xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() || undefined;
}

function basename(path: string) {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? path;
}
