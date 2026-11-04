import { describe, expect, it } from "vitest";
import {
  officialAgentMentionsEnvEnabled,
  officialCcdFilesMentionOptions,
  officialCcdFilesMentionProvider,
  officialSshCcdFilesMentionOptions,
  officialSshConfigForMentions,
  officialEpitaxyAgentMentionOptions,
  officialEpitaxyAgentsMentionProvider,
  officialMentionAtRange,
  officialMentionPathParts,
  officialUserSourceAgents,
  OFFICIAL_CCD_FILES_PROVIDER_ID,
  OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID,
  OFFICIAL_EPITAXY_AGENTS_QUERY_KEY,
} from "./officialComposerAgentMentions";

describe("official Qj @agent mention (c119 Jw / Zw)", () => {
  it("filters source===user only and does not remap local", () => {
    const rows = officialUserSourceAgents([
      { name: "reviewer", source: "user", description: "reviews" },
      { name: "local-bot", source: "local" },
      { name: "project", source: "project" },
    ]);
    expect(rows.map((row) => row.name)).toEqual(["reviewer"]);
  });

  it("maps fetchOptions to epitaxy-agents, query includes, slice 10", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      name: i === 0 ? "alpha" : `user-${i}`,
      source: "user" as const,
      description: i === 0 ? "first" : undefined,
    }));
    const options = officialEpitaxyAgentMentionOptions(rows, "alp");
    expect(options).toEqual([
      {
        category: "Agents",
        description: "first",
        id: "alpha",
        label: "alpha",
        providerId: OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID,
      },
    ]);
    expect(officialEpitaxyAgentMentionOptions(rows, "").length).toBe(10);
  });

  it("onSelect calls onAgentMention and resolves null (no chip)", async () => {
    const seen: string[] = [];
    const provider = officialEpitaxyAgentsMentionProvider({
      getAgents: async () => [{ name: "reviewer", source: "user" }],
      onAgentMention: (name) => seen.push(name),
    });
    expect(provider?.id).toBe(OFFICIAL_EPITAXY_AGENTS_PROVIDER_ID);
    await expect(provider?.onSelect("reviewer")).resolves.toBeNull();
    expect(seen).toEqual(["reviewer"]);
  });

  it("Us env: local/ssh true, remote false", () => {
    expect(officialAgentMentionsEnvEnabled("local")).toBe(true);
    expect(officialAgentMentionsEnvEnabled("ssh")).toBe(true);
    expect(officialAgentMentionsEnvEnabled("remote")).toBe(false);
    expect(officialAgentMentionsEnvEnabled(undefined)).toBe(false);
  });

  it("mention at-range matches official (?:^|\\s)@(\\S*)$", () => {
    expect(officialMentionAtRange("@rev", 4)).toEqual({ from: 0, to: 4 });
    expect(officialMentionAtRange("hey @rev", 8)).toEqual({ from: 4, to: 8 });
    expect(officialMentionAtRange("nope", 4)).toBeNull();
  });

  it("query key is epitaxy/agents/null", () => {
    expect(OFFICIAL_EPITAXY_AGENTS_QUERY_KEY).toEqual(["epitaxy", "agents", null]);
  });

  it("maps Le.fetchMentionOptions files through vm ccd-files", async () => {
    expect(officialMentionPathParts("src/a.ts")).toEqual({ name: "a.ts", dir: "src" });
    const options = officialCcdFilesMentionOptions([
      {
        id: "file-/tmp/src/a.ts",
        label: "src/a.ts",
        metadata: JSON.stringify({ path: "src/a.ts", isDirectory: false }),
        category: "Files",
      },
    ]);
    expect(options[0]).toMatchObject({
      id: "file-/tmp/src/a.ts",
      label: "a.ts",
      description: "src",
      providerId: OFFICIAL_CCD_FILES_PROVIDER_ID,
      renderedText: "src/a.ts",
      metadata: { path: "src/a.ts", isDirectory: false },
    });
    const provider = officialCcdFilesMentionProvider({
      fetchMentionOptions: async () => [
        { id: "file-/tmp/src/a.ts", label: "src/a.ts", metadata: JSON.stringify({ path: "src/a.ts" }) },
      ],
    });
    await expect(provider?.onSelect("file-/tmp/src/a.ts")).resolves.toEqual({ chipText: "file-/tmp/src/a.ts" });
    expect(officialCcdFilesMentionProvider({})).toBeNull();
  });

  it("maps listSSHDirectory entries through vm SSH ccd-files", async () => {
    const ssh = officialSshConfigForMentions(
      { host: "box", sshHost: "box", remoteCwd: "/home/me" },
      "/home/me/src",
    );
    expect(ssh).toEqual(expect.objectContaining({ host: "box", remoteCwd: "/home/me/src" }));
    const options = officialSshCcdFilesMentionOptions(
      [
        { name: "a.ts", path: "/home/me/src/a.ts", isDirectory: false },
        { name: "lib", path: "/home/me/src/lib", isDirectory: true },
        { name: "skip.ts", path: "/home/me/src/skip.ts", isDirectory: false },
      ],
      "a.ts",
      "box",
    );
    expect(options).toEqual([
      {
        category: "box",
        description: "/home/me/src",
        id: "/home/me/src/a.ts",
        label: "a.ts",
        metadata: { isDirectory: false },
        providerId: OFFICIAL_CCD_FILES_PROVIDER_ID,
        renderedText: "a.ts",
      },
    ]);
    const listed: unknown[] = [];
    const provider = officialCcdFilesMentionProvider({
      listSSHDirectory: async (config, path) => {
        listed.push([config, path]);
        return { entries: [{ name: "a.ts", path: "/home/me/src/a.ts", isDirectory: false }], error: null };
      },
      sshConfigForMentions: ssh,
    });
    expect(await provider?.fetchOptions("a")).toHaveLength(1);
    expect(listed[0]).toEqual([ssh, "/home/me/src"]);
    expect(officialCcdFilesMentionProvider({ sshConfigForMentions: ssh })).toBeNull();
  });

  it("je insertFileMention uses ccd-files attrs", async () => {
    const { officialInsertCcdFileMention } = await import("./officialComposerMentionSelect");
    const inserted: unknown[] = [];
    const editor = {
      isDestroyed: false,
      chain: () => {
        const api = {
          focus: () => api,
          insertContent: (content: unknown) => {
            inserted.push(content);
            return api;
          },
          run: () => true,
        };
        return api;
      },
    };
    expect(officialInsertCcdFileMention(editor as never, "src/a.ts")).toBe(true);
    expect(inserted[0]).toEqual([
      {
        type: "mention",
        attrs: {
          id: "src/a.ts",
          label: "a.ts",
          providerId: "ccd-files",
          renderedText: "src/a.ts",
        },
      },
      { type: "text", text: " " },
    ]);
  });
});
