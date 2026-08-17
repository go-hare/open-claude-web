import { describe, expect, it } from "vitest";
import { organizationUuidFromBootstrap } from "./accountSettingsApi";

describe("organizationUuidFromBootstrap", () => {
  it("reads product 3p residual memberships[0].organization.uuid", () => {
    expect(
      organizationUuidFromBootstrap({
        account: {
          memberships: [
            { organization: { uuid: "00000000-0000-4000-8000-000000000001" } },
          ],
        },
      }),
    ).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("prefers top-level organization when present", () => {
    expect(
      organizationUuidFromBootstrap({
        organization: { uuid: "top-org" },
        account: {
          memberships: [{ organization: { uuid: "member-org" } }],
        },
      }),
    ).toBe("top-org");
  });

  it("returns null when account missing or empty memberships", () => {
    expect(organizationUuidFromBootstrap(null)).toBeNull();
    expect(organizationUuidFromBootstrap({})).toBeNull();
    expect(organizationUuidFromBootstrap({ account: { memberships: [] } })).toBeNull();
  });
});
