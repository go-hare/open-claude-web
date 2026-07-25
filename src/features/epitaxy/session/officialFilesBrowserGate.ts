/**
 * Official VC() residual (c11959232):
 *   el("ccd_file_browser") && fe?.listSessionDirectory && Le?.fetchMentionOptions
 *
 * Pure gate helpers — no desktopBridge / window import so unit tests can run in node.
 * OfficialFilesBrowserPane wires bridge + bootstrap load around these.
 */
import { readBootstrapFeatureFlag } from "../../settings/notificationRowGates";

export const CCD_FILE_BROWSER_FLAG = "ccd_file_browser";

/** Sync cache of el("ccd_file_browser") — undefined until bootstrap resolves. */
let cachedCcdFileBrowser: boolean | undefined;
let ccdFileBrowserLoad: Promise<boolean> | null = null;

export type FilesBrowserBridgeShape = {
  listSessionDirectory?: unknown;
};

export type FilesBrowserResourcesShape = {
  fetchMentionOptions?: unknown;
} | null | undefined;

export function bridgesSupportFilesBrowser(
  bridge: FilesBrowserBridgeShape | null | undefined,
  resources: FilesBrowserResourcesShape,
): boolean {
  return Boolean(bridge?.listSessionDirectory && resources?.fetchMentionOptions);
}

/**
 * Official el("ccd_file_browser"): missing → false (not "show until known").
 */
export function ccdFileBrowserFlagFromBootstrap(
  bootstrap: Record<string, unknown> | null | undefined,
): boolean {
  return readBootstrapFeatureFlag(bootstrap, CCD_FILE_BROWSER_FLAG) === true;
}

export function loadCcdFileBrowserFlag(
  loadBootstrap: () => Promise<Record<string, unknown> | null>,
): Promise<boolean> {
  if (cachedCcdFileBrowser !== undefined) return Promise.resolve(cachedCcdFileBrowser);
  if (!ccdFileBrowserLoad) {
    ccdFileBrowserLoad = loadBootstrap()
      .then((payload) => {
        const on = ccdFileBrowserFlagFromBootstrap(payload);
        cachedCcdFileBrowser = on;
        return on;
      })
      .catch(() => {
        cachedCcdFileBrowser = false;
        return false;
      });
  }
  return ccdFileBrowserLoad;
}

export function getCachedCcdFileBrowserFlag(): boolean | undefined {
  return cachedCcdFileBrowser;
}

/** Test/helper: reset cached GrowthBook gate between unit cases. */
export function resetOfficialFilesBrowserFlagCacheForTests(): void {
  cachedCcdFileBrowser = undefined;
  ccdFileBrowserLoad = null;
}

/**
 * Official VC() — Files Views item + ⇧⌘F.
 * Requires GrowthBook ccd_file_browser === true AND listSessionDirectory + fetchMentionOptions.
 */
export function evaluateOfficialFilesBrowserGate(input: {
  bridge: FilesBrowserBridgeShape | null | undefined;
  resources: FilesBrowserResourcesShape;
  /** Explicit el("ccd_file_browser"); omit to use bootstrap cache (optionally kick load). */
  featureFlag?: boolean | undefined;
  loadBootstrap?: () => Promise<Record<string, unknown> | null>;
}): boolean {
  if (!bridgesSupportFilesBrowser(input.bridge, input.resources)) return false;
  if ("featureFlag" in input) {
    return input.featureFlag === true;
  }
  if (input.loadBootstrap) {
    void loadCcdFileBrowserFlag(input.loadBootstrap);
  }
  return cachedCcdFileBrowser === true;
}
