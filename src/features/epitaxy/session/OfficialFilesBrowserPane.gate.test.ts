import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bridgesSupportFilesBrowser,
  ccdFileBrowserFlagFromBootstrap,
  evaluateOfficialFilesBrowserGate,
  loadCcdFileBrowserFlag,
  resetOfficialFilesBrowserFlagCacheForTests,
} from "./officialFilesBrowserGate";

afterEach(() => {
  resetOfficialFilesBrowserFlagCacheForTests();
  vi.restoreAllMocks();
});

describe("official Files VC() gate", () => {
  it("requires both listSessionDirectory and fetchMentionOptions", () => {
    expect(
      bridgesSupportFilesBrowser(
        { listSessionDirectory: async () => [] },
        { fetchMentionOptions: async () => [] },
      ),
    ).toBe(true);
    expect(
      bridgesSupportFilesBrowser({ listSessionDirectory: async () => [] }, {}),
    ).toBe(false);
    expect(
      bridgesSupportFilesBrowser({}, { fetchMentionOptions: async () => [] }),
    ).toBe(false);
  });

  it("el(ccd_file_browser): missing → false, true → true, false → false", () => {
    expect(ccdFileBrowserFlagFromBootstrap({})).toBe(false);
    expect(ccdFileBrowserFlagFromBootstrap(null)).toBe(false);
    expect(
      ccdFileBrowserFlagFromBootstrap({ feature_flags: { ccd_file_browser: true } }),
    ).toBe(true);
    expect(
      ccdFileBrowserFlagFromBootstrap({ feature_flags: { ccd_file_browser: false } }),
    ).toBe(false);
    expect(
      ccdFileBrowserFlagFromBootstrap({
        growthbook: { features: { ccd_file_browser: { defaultValue: true } } },
      }),
    ).toBe(true);
  });

  it("hides when flag missing even if bridges exist", () => {
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        featureFlag: undefined,
      }),
    ).toBe(false);
  });

  it("hides when flag false", () => {
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        featureFlag: false,
      }),
    ).toBe(false);
  });

  it("shows only when flag true AND bridges exist", () => {
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        featureFlag: true,
      }),
    ).toBe(true);
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: {},
        resources: { fetchMentionOptions: true },
        featureFlag: true,
      }),
    ).toBe(false);
  });

  it("async load: missing bootstrap flag caches false", async () => {
    const loadBootstrap = vi.fn(async () => ({}));
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        loadBootstrap,
      }),
    ).toBe(false);
    await loadCcdFileBrowserFlag(loadBootstrap);
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        loadBootstrap,
      }),
    ).toBe(false);
  });

  it("async load: true flag enables after cache fill", async () => {
    const loadBootstrap = vi.fn(async () => ({
      feature_flags: { ccd_file_browser: true },
    }));
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        loadBootstrap,
      }),
    ).toBe(false);
    await loadCcdFileBrowserFlag(loadBootstrap);
    expect(
      evaluateOfficialFilesBrowserGate({
        bridge: { listSessionDirectory: true },
        resources: { fetchMentionOptions: true },
        loadBootstrap,
      }),
    ).toBe(true);
  });
});
