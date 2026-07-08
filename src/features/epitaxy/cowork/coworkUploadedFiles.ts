import { createMessageUuid } from "../../../adapters/desktopBridge/messageUuid";

export type CoworkUploadedFile = {
  fileName: string;
  fileUuid?: string;
  path: string;
};

export function createCoworkUploadedFile(path: string): CoworkUploadedFile {
  return { fileName: basename(path), fileUuid: createMessageUuid(), path };
}

export function mergeCoworkUploadedFiles(current: CoworkUploadedFile[], filePaths: string[]) {
  const byPath = new Map(current.map((file) => [file.path, file]));
  for (const path of filePaths.filter(Boolean)) {
    if (!byPath.has(path)) byPath.set(path, createCoworkUploadedFile(path));
  }
  return Array.from(byPath.values());
}

export function formatCoworkPromptWithUploadedFiles(prompt: string, files: Array<CoworkUploadedFile | string>) {
  if (files.length === 0) return prompt;
  const filesXml = files.map((file) => {
    const uploadedFile: Pick<CoworkUploadedFile, "fileUuid" | "path"> = typeof file === "string" ? { path: file } : file;
    const fileUuid = uploadedFile.fileUuid ? `<file_uuid>${uploadedFile.fileUuid}</file_uuid>` : "";
    return `<file><file_path>${uploadedFile.path}</file_path>${fileUuid}</file>`;
  }).join("\n");
  return `<uploaded_files>\n${filesXml}\n</uploaded_files>\n\n${prompt}`;
}

export function coworkUploadedFilePaths(files: CoworkUploadedFile[]) {
  return files.map((file) => file.path);
}

export function parseCoworkUploadedFilesText(text: string) {
  const uploadedMatch = text.match(/<uploaded_files>([\s\S]*?)<\/uploaded_files>/);
  if (!uploadedMatch) return { files: [] as CoworkUploadedFile[], text };
  return {
    files: parseCoworkUploadedFiles(uploadedMatch[1] ?? ""),
    text: text.replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "").trim(),
  };
}

function parseCoworkUploadedFiles(xml: string): CoworkUploadedFile[] {
  return Array.from(xml.matchAll(/<file>([\s\S]*?)<\/file>/g)).flatMap((match) => {
    const fileXml = match[1] ?? "";
    const path = tagValue(fileXml, "file_path");
    if (!path) return [];
    return [{ fileName: basename(path), fileUuid: tagValue(fileXml, "file_uuid"), path }];
  });
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() || undefined;
}

function basename(path: string) {
  return path.replace(/\\/g, "/").split("/").filter(Boolean).at(-1) ?? path;
}
