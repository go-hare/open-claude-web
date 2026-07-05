import { createContext, useContext } from "react";
import type { FrameStore } from "./frameStore";

export const FrameContext = createContext<FrameStore | null>(null);

export function useFrameContext() {
  return useContext(FrameContext);
}
