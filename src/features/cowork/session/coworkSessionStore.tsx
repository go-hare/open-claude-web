import { createContext, useContext, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { SendMessageInput } from "../../../adapters/desktopBridge/types";
import type { CoworkPermissionRequest } from "./coworkPermissionTypes";
import { createInitialCoworkSessionState } from "./coworkSessionHydration";
import type { CoworkSessionDataState } from "./types";

type PermissionUpdater = (
  value: CoworkPermissionRequest[] | ((current: CoworkPermissionRequest[]) => CoworkPermissionRequest[]),
) => void;

export type CoworkSessionContextValue = CoworkSessionDataState & {
  isResponding: boolean;
  messageUuids: string[];
  reload: () => Promise<void>;
  setPermissionRequests: PermissionUpdater;
  streamTokenEstimate: number;
  submitMessage: (text: string, input?: SendMessageInput) => Promise<void>;
};

type CoworkSessionStoreState = {
  sessionContext: CoworkSessionContextValue;
};

export type CoworkSessionStore = StoreApi<CoworkSessionStoreState>;

const CoworkSessionStoreContext = createContext<CoworkSessionStore | null>(null);
const noop = () => {};
const asyncNoop = async () => {};
const fallbackStore = createCoworkSessionStore("missing-session");

export function createCoworkSessionStore(sessionId: string): CoworkSessionStore {
  return createStore(() => ({ sessionContext: initialContext(sessionId) }));
}

export function CoworkSessionStoreProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: CoworkSessionStore;
}) {
  return <CoworkSessionStoreContext.Provider value={store}>{children}</CoworkSessionStoreContext.Provider>;
}

export function useCoworkSessionContext() {
  const store = useContext(CoworkSessionStoreContext) ?? fallbackStore;
  return useStore(store, (state) => state.sessionContext);
}

function initialContext(sessionId: string): CoworkSessionContextValue {
  return {
    ...createInitialCoworkSessionState(sessionId),
    isResponding: false,
    messageUuids: [],
    reload: asyncNoop,
    setPermissionRequests: noop,
    streamTokenEstimate: 0,
    submitMessage: asyncNoop,
  };
}
