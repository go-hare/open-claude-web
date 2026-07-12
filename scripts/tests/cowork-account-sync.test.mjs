import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { accountDetailsFromBootstrap, syncDesktopCoworkAccount } = await vite.ssrLoadModule(
  "/src/app/useDesktopCoworkAccountSync.ts",
);

after(async () => {
  await vite.close();
});

test("maps the official bootstrap account fields", () => {
  assert.deepEqual(
    accountDetailsFromBootstrap({
      account: {
        display_name: "Claude",
        email_address: "claude@example.com",
        full_name: "Claude User",
        memberships: [{ organization: { uuid: "org-1" } }],
        tagged_id: "account-tag",
        uuid: "account-1",
      },
    }),
    {
      accountTaggedId: "account-tag",
      accountUuid: "account-1",
      displayName: "Claude",
      emailAddress: "claude@example.com",
      fullName: "Claude User",
      hasWiggle: false,
      isLoggedOut: false,
      isRaven: false,
    },
  );
});

test("reports logged out when bootstrap has no account uuid", () => {
  assert.equal(
    accountDetailsFromBootstrap({ account: {} }).isLoggedOut,
    true,
  );
});

test("does not report logout when bootstrap transport fails", async () => {
  const updates = [];
  const controller = new AbortController();
  await syncDesktopCoworkAccount(
    (details) => updates.push(details),
    controller.signal,
    async () => {
      throw new Error("bootstrap unavailable");
    },
  );
  assert.deepEqual(updates, []);
});
