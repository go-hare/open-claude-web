import { useCoworkSessionContext } from "./coworkSessionStore";

export function useCoworkSessionData() {
  return useCoworkSessionContext();
}
