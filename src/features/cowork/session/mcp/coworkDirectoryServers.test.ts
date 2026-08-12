import { describe, expect, it } from "vitest";
import {
  filterDirectoryServersByKeywords,
  listInstalledCoworkDirectoryServers,
  lookupCoworkDirectoryServers,
  parseDirectoryEventData,
  searchCoworkDirectoryServers,
} from "./coworkDirectoryServers";

describe("directory_servers residual (D1e pae/mae)", () => {
  it("parseDirectoryEventData reads requestId / keywords / uuids from JSON string", () => {
    expect(
      parseDirectoryEventData(
        JSON.stringify({
          requestId: "req-1",
          keywords: ["gmail", "calendar"],
          uuids: ["u1"],
        }),
      ),
    ).toEqual({
      requestId: "req-1",
      keywords: ["gmail", "calendar"],
      uuids: ["u1"],
    });
  });

  it("parseDirectoryEventData tolerates object payload and garbage", () => {
    expect(
      parseDirectoryEventData({ requestId: "r", keywords: ["x", 1, "y"] }),
    ).toEqual({ requestId: "r", keywords: ["x", "y"], uuids: undefined });
    expect(parseDirectoryEventData("not-json")).toEqual({});
    expect(parseDirectoryEventData(null)).toEqual({});
  });

  it("search with empty keywords returns first-party catalog (Tne residual)", async () => {
    const servers = await searchCoworkDirectoryServers([]);
    const names = servers.map((s) => s.name).sort();
    expect(names).toEqual(["Gmail", "Google Calendar", "Google Drive"]);
    expect(servers.every((s) => typeof s.uuid === "string" && s.uuid.length > 0)).toBe(true);
  });

  it("search keywords fuse-filter hits Gmail", async () => {
    const servers = await searchCoworkDirectoryServers(["gmail"]);
    expect(servers.some((s) => s.name === "Gmail")).toBe(true);
    expect(servers.every((s) => /gmail|inbox|email/i.test(
      `${s.name} ${s.oneLiner ?? ""} ${s.description ?? ""}`,
    ) || s.name === "Gmail")).toBe(true);
  });

  it("lookup by uuid returns Gmail card", async () => {
    const gmailUuid = "8c1b41b4-c060-4704-8c17-95c39fa3511c";
    const hits = await lookupCoworkDirectoryServers([gmailUuid, "missing"]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.name).toBe("Gmail");
    expect(hits[0]?.uuid).toBe(gmailUuid);
  });

  it("lookup empty uuids → []", async () => {
    expect(await lookupCoworkDirectoryServers([])).toEqual([]);
    expect(await lookupCoworkDirectoryServers(undefined)).toEqual([]);
  });

  it("list_installed with empty registry → []", () => {
    expect(listInstalledCoworkDirectoryServers(undefined)).toEqual([]);
    expect(listInstalledCoworkDirectoryServers(["gmail"])).toEqual([]);
  });

  it("filterDirectoryServersByKeywords empty → identity", () => {
    const catalog = [
      {
        uuid: "a",
        name: "Alpha",
        oneLiner: "a tool",
        description: "desc",
        toolNames: ["t1"],
      },
    ];
    expect(filterDirectoryServersByKeywords(catalog, [])).toEqual(catalog);
    expect(filterDirectoryServersByKeywords(catalog, undefined)).toEqual(catalog);
  });
});
