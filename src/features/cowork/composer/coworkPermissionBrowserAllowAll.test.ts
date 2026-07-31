import { describe, expect, it } from "vitest";
import {
  canShowCoworkBrowserAllowAll,
  readCoworkBrowserAllowAllBootstrap,
} from "./coworkPermissionBrowserAllowAll";

describe("canShowCoworkBrowserAllowAll (Dfe residual)", () => {
  it("true only with org and non-raven", () => {
    expect(canShowCoworkBrowserAllowAll({ hasActiveOrganization: true, isRavenOrg: false })).toBe(true);
    expect(canShowCoworkBrowserAllowAll({ hasActiveOrganization: true, isRavenOrg: true })).toBe(false);
    expect(canShowCoworkBrowserAllowAll({ hasActiveOrganization: false, isRavenOrg: false })).toBe(false);
  });
});

describe("readCoworkBrowserAllowAllBootstrap", () => {
  it("reads org uuid + raven flags", () => {
    expect(
      readCoworkBrowserAllowAllBootstrap({
        account: { is_raven: false },
        organization: { uuid: "org-1" },
      }),
    ).toEqual({ hasActiveOrganization: true, isRavenOrg: false });
    expect(
      readCoworkBrowserAllowAllBootstrap({
        account: { is_raven: true },
        organization: { uuid: "org-1" },
      }),
    ).toEqual({ hasActiveOrganization: true, isRavenOrg: true });
    expect(readCoworkBrowserAllowAllBootstrap({})).toEqual({
      hasActiveOrganization: false,
      isRavenOrg: false,
    });
  });
});
