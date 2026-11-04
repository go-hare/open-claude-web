/**
 * Official c6e1 `M` / `ne` / `tu` — Code Files native preview (On).
 * html/svg/pdf + office. Office waits `isVmReady` then soffice convert (host-loop).
 */

export const CODE_NATIVE_PREVIEW_EXT = /\.(html?|svg|pdf|docx?|pptx?|xlsx?)$/i;
export const CODE_OFFICE_NATIVE_PREVIEW_EXT = /\.(docx?|pptx?|xlsx?)$/i;

export function isCodeNativePreviewPath(filePath: string): boolean {
  return CODE_NATIVE_PREVIEW_EXT.test(filePath);
}

export function isCodeOfficeNativePreviewPath(filePath: string): boolean {
  return CODE_OFFICE_NATIVE_PREVIEW_EXT.test(filePath);
}
