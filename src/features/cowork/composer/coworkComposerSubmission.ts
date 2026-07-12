import type {
  CoworkImagePayload,
  CoworkToolState,
  SendMessageInput,
} from "../../../adapters/desktopBridge/types";
import {
  coworkUploadedFilePaths,
  formatCoworkPromptWithUploadedFiles,
  type CoworkUploadedFile,
} from "../newTask/coworkUploadedFiles";

export type CoworkComposerSubmission = {
  input: SendMessageInput | undefined;
  text: string;
};

export function createCoworkComposerSubmission(input: {
  images?: CoworkImagePayload[];
  prompt: string;
  selectedFiles: CoworkUploadedFile[];
  toolStates?: CoworkToolState[];
}): CoworkComposerSubmission {
  const text = formatCoworkPromptWithUploadedFiles(input.prompt.trim(), input.selectedFiles);
  const userSelectedFiles = coworkUploadedFilePaths(input.selectedFiles);
  const messageInput = compactMessageInput({
    images: input.images,
    toolStates: input.toolStates,
    userSelectedFiles,
  });
  return { input: messageInput, text };
}

function compactMessageInput(input: SendMessageInput) {
  const images = input.images?.length ? input.images : undefined;
  const toolStates = input.toolStates?.length ? input.toolStates : undefined;
  const userSelectedFiles = input.userSelectedFiles?.length ? input.userSelectedFiles : undefined;
  if (!images && !toolStates && !userSelectedFiles) return undefined;
  return { images, toolStates, userSelectedFiles };
}
