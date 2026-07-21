/**
 * Pure helpers for D1e reverse-RPC + rate_limit map/store (node:test + vite ssr).
 * Replaces vitest-only co-located *.test.ts so the repo test harness stays uniform.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const {
  extractRateLimitInfoFromMessageEvent,
  mapCoworkRateLimitInfo,
  scanCoworkTranscriptRateLimit,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/rateLimit/coworkRateLimitMap.ts",
);
const {
  applyCoworkRateLimitToStore,
  createCoworkRateLimitStore,
  coworkRateLimitStore,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/rateLimit/coworkRateLimitStore.ts",
);
const {
  filterDirectoryServersByKeywords,
  listInstalledCoworkDirectoryServers,
  lookupCoworkDirectoryServers,
  parseDirectoryEventData,
  searchCoworkDirectoryServers,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkDirectoryServers.ts",
);
const { createCoworkMcpRegistryStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkMcpRegistryStore.ts",
);
const { coworkMcpRegistryStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkMcpRegistryStoreSingleton.ts",
);
const {
  filterCoworkSlashSkills,
  normalizeSlashSkillName,
  resolveCoworkSlashMenuSkills,
  searchCoworkAddableSkills,
  setCoworkAddableSlashSkills,
  setCoworkInstalledSlashSkills,
  slashCommandsToSkills,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkSlashSkills.ts",
);
const {
  buildPluginSearchTerms,
  filterPluginsByTerms,
  pluginId,
  searchCoworkPluginsResponse,
  setCoworkCatalogPlugins,
  setCoworkInstalledPlugins,
  setCoworkPluginOrgUuid,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkPluginSearch.ts",
);

after(async () => {
  await vite.close();
});

before(() => {
  const empty = createCoworkMcpRegistryStore().getState();
  coworkMcpRegistryStore.setState({
    remoteServers: empty.remoteServers,
    remoteDirectories: empty.remoteDirectories,
    remoteTools: empty.remoteTools,
    localClients: empty.localClients,
    localTools: empty.localTools,
  });
  const fresh = createCoworkRateLimitStore().getState();
  coworkRateLimitStore.setState({
    messageLimits: fresh.messageLimits,
    lastSessionId: fresh.lastSessionId,
  });
});

test("mapCoworkRateLimitInfo (official jue)", () => {
  assert.deepEqual(
    mapCoworkRateLimitInfo({ status: "allowed", isUsingOverage: false }),
    { type: "within_limit", overageInUse: false },
  );
  const approaching = mapCoworkRateLimitInfo({
    status: "allowed_warning",
    rateLimitType: "five_hour",
    resetsAt: 1_700_000_000,
    utilization: 0.9,
    surpassedThreshold: 0.8,
    isUsingOverage: false,
  });
  assert.equal(approaching.type, "approaching_limit");
  assert.equal(approaching.resetsAt, 1_700_000_000);
  assert.equal(approaching.windows["5h"]?.status, "approaching_limit");
  assert.equal(
    mapCoworkRateLimitInfo({
      status: "rejected",
      rateLimitType: "seven_day",
      resetsAt: 99,
      utilization: 1,
    }).type,
    "exceeded_limit",
  );
  assert.deepEqual(
    mapCoworkRateLimitInfo({
      status: "allowed_warning",
      rateLimitType: "five_hour",
    }),
    { type: "within_limit", overageInUse: undefined },
  );
});

test("extractRateLimitInfoFromMessageEvent", () => {
  const info = { status: "rejected", rateLimitType: "five_hour", resetsAt: 1 };
  assert.deepEqual(
    extractRateLimitInfoFromMessageEvent({
      type: "message",
      message: { type: "rate_limit_event", rate_limit_info: info },
    }),
    info,
  );
  assert.deepEqual(
    extractRateLimitInfoFromMessageEvent({
      type: "rate_limit_event",
      rate_limit_info: { status: "allowed" },
    }),
    { status: "allowed" },
  );
  assert.equal(
    extractRateLimitInfoFromMessageEvent({
      type: "message",
      message: { type: "assistant" },
    }),
    null,
  );
});

test("applyCoworkRateLimitToStore", () => {
  const fresh = createCoworkRateLimitStore().getState();
  coworkRateLimitStore.setState({
    messageLimits: fresh.messageLimits,
    lastSessionId: fresh.lastSessionId,
  });
  applyCoworkRateLimitToStore(
    mapCoworkRateLimitInfo({
      status: "allowed_warning",
      rateLimitType: "five_hour",
      resetsAt: 42,
      utilization: 0.85,
    }),
    { orgUuid: "org-1", sessionId: "local_session" },
  );
  assert.equal(
    coworkRateLimitStore.getState().getMessageLimit("org-1")?.type,
    "approaching_limit",
  );
  assert.equal(
    coworkRateLimitStore.getState().getMessageLimit("org-1")?.conversationUuid,
    "local_session",
  );
  applyCoworkRateLimitToStore(
    mapCoworkRateLimitInfo({
      status: "rejected",
      rateLimitType: "seven_day",
      resetsAt: 1,
    }),
    { sessionId: "s1" },
  );
  assert.equal(
    coworkRateLimitStore.getState().getMessageLimit("_")?.type,
    "exceeded_limit",
  );
});

test("scanCoworkTranscriptRateLimit (official Tke.scanTranscript)", () => {
  const now = 2_000_000_000;
  const future = now + 3600;
  const past = now - 10;
  // Newest non-within with future resets wins.
  const hit = scanCoworkTranscriptRateLimit(
    [
      { type: "assistant", uuid: "a1" },
      {
        type: "rate_limit_event",
        rate_limit_info: {
          status: "rejected",
          rateLimitType: "five_hour",
          resetsAt: past,
          utilization: 1,
        },
      },
      {
        type: "rate_limit_event",
        rate_limit_info: {
          status: "allowed_warning",
          rateLimitType: "five_hour",
          resetsAt: future,
          utilization: 0.9,
          surpassedThreshold: 0.8,
        },
      },
      { type: "user", uuid: "u1" },
    ],
    now,
  );
  assert.equal(hit?.type, "approaching_limit");
  assert.equal(hit?.resetsAt, future);

  // within_limit on newest rate event → null (official early return).
  assert.equal(
    scanCoworkTranscriptRateLimit(
      [
        {
          type: "rate_limit_event",
          rate_limit_info: { status: "allowed" },
        },
      ],
      now,
    ),
    null,
  );

  // expired resetsAt → null.
  assert.equal(
    scanCoworkTranscriptRateLimit(
      [
        {
          type: "rate_limit_event",
          rate_limit_info: {
            status: "rejected",
            rateLimitType: "seven_day",
            resetsAt: past,
            utilization: 1,
          },
        },
      ],
      now,
    ),
    null,
  );

  // Message-envelope shape (bridge) also accepted.
  const env = scanCoworkTranscriptRateLimit(
    [
      {
        type: "message",
        message: {
          type: "rate_limit_event",
          rate_limit_info: {
            status: "rejected",
            rateLimitType: "five_hour",
            resetsAt: future,
            utilization: 1,
          },
        },
      },
    ],
    now,
  );
  assert.equal(env?.type, "exceeded_limit");
});

test("searchCoworkDirectoryServers first-party catalog", async () => {
  const hits = await searchCoworkDirectoryServers([]);
  assert.ok(hits.some((h) => h.name === "Gmail"));
  assert.ok(hits.some((h) => h.name === "Google Calendar"));
  const gmail = await searchCoworkDirectoryServers(["gmail"]);
  assert.ok(gmail.some((h) => h.name === "Gmail"));
});

test("lookup / list_installed directory servers", async () => {
  const hits = await lookupCoworkDirectoryServers([
    "8c1b41b4-c060-4704-8c17-95c39fa3511c",
  ]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.name, "Gmail");
  coworkMcpRegistryStore.getState().setRemoteServer("r1", {
    name: "Installed",
    url: "https://x",
    uuid: "r1",
  });
  coworkMcpRegistryStore.getState().setRemoteDirectory("r1", {
    iconUrl: "https://icon",
  });
  const installed = listInstalledCoworkDirectoryServers([]);
  assert.ok(installed.some((s) => s.name === "Installed" && s.isConnected));
});

test("parseDirectoryEventData / filterDirectoryServersByKeywords", () => {
  assert.deepEqual(
    parseDirectoryEventData(
      JSON.stringify({ requestId: "req", keywords: ["a"], uuids: ["u"] }),
    ),
    { requestId: "req", keywords: ["a"], uuids: ["u"] },
  );
  const filtered = filterDirectoryServersByKeywords(
    [
      { uuid: "1", name: "Gmail", oneLiner: "mail" },
      { uuid: "2", name: "Drive", oneLiner: "files" },
    ],
    ["gmail"],
  );
  assert.equal(filtered[0]?.name, "Gmail");
});

test("slash skills normalize/filter/catalog", () => {
  assert.equal(normalizeSlashSkillName("plugin:git:commit"), "commit");
  assert.equal(normalizeSlashSkillName("docs"), "docs");
  setCoworkInstalledSlashSkills([
    { name: "git:commit", description: "Commit helpers" },
    { name: "docs", description: "Write documentation" },
  ]);
  setCoworkAddableSlashSkills([
    { name: "legal-review", description: "Contract review" },
    { name: "sales-prep", description: "Prep for sales calls" },
  ]);
  const filtered = filterCoworkSlashSkills(
    [
      { name: "git:commit", description: "x" },
      { name: "docs", description: "y" },
    ],
    ["commit"],
    ["docs"],
  );
  assert.deepEqual(
    filtered.map((h) => h.name),
    ["git:commit"],
  );
  assert.equal(resolveCoworkSlashMenuSkills(["docs"], undefined)[0]?.name, "docs");
  assert.equal(searchCoworkAddableSkills(["sales"])[0]?.name, "sales-prep");
  assert.deepEqual(
    slashCommandsToSkills([{ name: "btw", description: "side question" }]),
    [
      {
        name: "btw",
        description: "side question",
        argumentHint: undefined,
        skillId: "btw",
      },
    ],
  );
});

test("plugin search terms / filter / honest empty catalog", () => {
  const terms = buildPluginSearchTerms("please help with sales pipeline", ["crm"]);
  assert.ok(terms.includes("crm"));
  assert.ok(terms.includes("sales"));
  assert.ok(terms.includes("pipeline"));
  assert.deepEqual(buildPluginSearchTerms("please help", undefined), []);
  setCoworkPluginOrgUuid(null);
  setCoworkInstalledPlugins([
    {
      id: pluginId("sales-kit", "org"),
      name: "sales-kit",
      description: "Sales workflows",
      marketplaceName: "org",
      skills: [{ name: "prep-call", description: "Prep calls" }],
      skillNames: ["prep-call"],
      mcpServerNames: [],
    },
  ]);
  setCoworkCatalogPlugins([
    {
      id: pluginId("legal-pack", "org"),
      name: "legal-pack",
      description: "Contracts",
      marketplaceName: "org",
      skills: [{ name: "review", description: "Review contracts" }],
      skillNames: ["review"],
      mcpServerNames: [],
    },
  ]);
  const installed = JSON.parse(
    searchCoworkPluginsResponse({ listInstalledOnly: true }),
  );
  assert.deepEqual(
    installed.results.map((r) => r.name),
    ["sales-kit"],
  );
  setCoworkCatalogPlugins([]);
  const empty = JSON.parse(
    searchCoworkPluginsResponse({ keywords: ["legal"] }),
  );
  assert.deepEqual(empty.results, []);
  setCoworkCatalogPlugins([
    {
      id: pluginId("legal-pack", "org"),
      name: "legal-pack",
      description: "Contracts",
      marketplaceName: "org",
      skills: [{ name: "review", description: "Review contracts" }],
      skillNames: ["review"],
      mcpServerNames: [],
    },
  ]);
  setCoworkPluginOrgUuid("org-1");
  const catalog = JSON.parse(
    searchCoworkPluginsResponse({ keywords: ["legal"] }),
  );
  assert.equal(catalog.results[0]?.name, "legal-pack");
  const plugins = [
    {
      id: "a@org",
      name: "Alpha",
      description: "",
      marketplaceName: "org",
      skills: [{ name: "spotify-sync", description: "" }],
      skillNames: ["spotify-sync"],
    },
  ];
  assert.equal(filterPluginsByTerms(plugins, ["spotify"])[0]?.name, "Alpha");
});
