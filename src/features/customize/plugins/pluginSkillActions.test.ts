import { describe, expect, it } from "vitest";
import {
  isPluginSkillUserInvocable,
  pluginSkillCustomizeHref,
  pluginSkillTryInChatHref,
} from "./pluginSkillActions";

describe("pluginSkillActions (official jX / x8t / try-in-chat)", () => {
  it("jX is userInvocable !== false", () => {
    expect(isPluginSkillUserInvocable({})).toBe(true);
    expect(isPluginSkillUserInvocable({ userInvocable: true })).toBe(true);
    expect(isPluginSkillUserInvocable({ userInvocable: false })).toBe(false);
  });

  it("slash skill opens /task/new?q=/:name", () => {
    expect(pluginSkillTryInChatHref("pack:greet", true)).toBe(
      "/task/new?" + new URLSearchParams({ q: "/pack:greet" }).toString(),
    );
  });

  it("auto skill uses the official skill-name template", () => {
    const href = pluginSkillTryInChatHref("pack:auto", false);
    expect(href.startsWith("/task/new?")).toBe(true);
    expect(href).toContain("skill-name=pack%3Aauto");
    expect(href).toContain("Hey+Claude");
  });

  it("x8t customize is /code on ccd and /task/new on cowork", () => {
    expect(pluginSkillCustomizeHref("demo", true, "greet")).toContain("/code?");
    expect(pluginSkillCustomizeHref("demo", false, "greet")).toContain("/task/new?");
    expect(pluginSkillCustomizeHref("demo", false, "greet")).toContain("greet");
    expect(pluginSkillCustomizeHref("demo", false, "greet")).toContain("skill");
  });
});
