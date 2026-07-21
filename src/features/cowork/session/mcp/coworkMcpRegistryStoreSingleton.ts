import {
  createCoworkMcpRegistryStore,
  type CoworkMcpRegistryStore,
} from "./coworkMcpRegistryStore";

/** Process-wide registry for D1e directory_servers_* + tool display (official a1-shaped subset). */
export const coworkMcpRegistryStore: CoworkMcpRegistryStore =
  createCoworkMcpRegistryStore();
