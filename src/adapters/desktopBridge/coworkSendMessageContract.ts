import type { CoworkImagePayload, CoworkToolState, SendMessageInput } from "./types";

export type OfficialCoworkSendMessageArgs = readonly [
  sessionId: string,
  message: string,
  images: CoworkImagePayload[],
  userSelectedFiles: string[] | undefined,
  messageUuid: string,
  toolStates: CoworkToolState[] | undefined,
];

export function buildOfficialCoworkSendMessageArgs(
  sessionId: string,
  message: string,
  input: SendMessageInput | undefined,
  messageUuid: string,
): OfficialCoworkSendMessageArgs {
  const userSelectedFiles = input?.userSelectedFiles;
  const toolStates = input?.toolStates;
  return [
    sessionId,
    message,
    input?.images ?? [],
    userSelectedFiles?.length ? userSelectedFiles : undefined,
    messageUuid,
    toolStates?.length ? toolStates : undefined,
  ];
}
