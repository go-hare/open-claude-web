import type { DragEvent } from "react";

const sessionDragType = "application/x-dframe-session-key";

export function writeCoworkSessionDragKey(event: DragEvent<HTMLElement>, key: string) {
  event.dataTransfer.setData(sessionDragType, key);
  event.dataTransfer.setData("text/plain", key);
  event.dataTransfer.effectAllowed = "copyMove";
}

export function readCoworkSessionDragKey(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData(sessionDragType) || event.dataTransfer.getData("text/plain");
}

export function hasCoworkSessionDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).some((type) => type === sessionDragType || type === "text/plain");
}
