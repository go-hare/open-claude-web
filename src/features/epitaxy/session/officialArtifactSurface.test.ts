import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extractOfficialArtifactSurface,
  isOfficialArtifactSurfaceInput,
  isOfficialArtifactTool,
  OFFICIAL_ARTIFACT_FAILED_PUBLISH_ID,
  OFFICIAL_ARTIFACT_KX_CLICKABLE,
  OFFICIAL_ARTIFACT_KX_OUTER,
  OFFICIAL_ARTIFACT_KX_ROW,
  OFFICIAL_ARTIFACT_OPEN_LABEL_ID,
  OFFICIAL_ARTIFACT_PUBLISHED_ID,
  OFFICIAL_ARTIFACT_PUBLISHING_ID,
  OFFICIAL_ARTIFACT_SOURCE_C26FB,
  OFFICIAL_ARTIFACT_SOURCE_C425,
  OFFICIAL_ARTIFACT_SOURCE_C52B,
  OFFICIAL_ARTIFACT_SOURCE_CD5A,
  OFFICIAL_ARTIFACT_SURFACE_KIND,
  OFFICIAL_ARTIFACT_UNTITLED_ID,
  officialArtifactFilePath,
  officialArtifactPublishedVerb,
  officialArtifactPinState,
} from "./officialArtifactSurface";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official Artifact → artifact_surface (cd5a IBe / c52b V / kX)", () => {
  it("maps tool name Artifact to kind artifact_surface (IBe.Artifact)", () => {
    expect(isOfficialArtifactTool("Artifact")).toBe(true);
    expect(isOfficialArtifactTool("Bash")).toBe(false);
    expect(OFFICIAL_ARTIFACT_SURFACE_KIND).toBe("artifact_surface");
    expect(OFFICIAL_ARTIFACT_SOURCE_CD5A).toBe("cd5a31703-B4nKQMBN.js");
    expect(OFFICIAL_ARTIFACT_SOURCE_C52B).toBe("c52b02f3f-DbJ5Omt6.js");
  });

  it("locks publish verbs including Published artifact 7uV1fZWnrM", () => {
    expect(OFFICIAL_ARTIFACT_PUBLISHED_ID).toBe("7uV1fZWnrM");
    expect(officialArtifactPublishedVerb("completed")).toEqual({
      id: "7uV1fZWnrM",
      text: "Published artifact",
    });
    expect(officialArtifactPublishedVerb("running")).toEqual({
      id: OFFICIAL_ARTIFACT_PUBLISHING_ID,
      text: "Publishing artifact",
    });
    expect(officialArtifactPublishedVerb("completed", true)).toEqual({
      id: OFFICIAL_ARTIFACT_FAILED_PUBLISH_ID,
      text: "Failed to publish artifact",
    });
  });

  it("treats omitted action / publish / open as kX surface input (cC), not pin/list", () => {
    expect(isOfficialArtifactSurfaceInput({})).toBe(true);
    expect(isOfficialArtifactSurfaceInput({ action: "publish", file_path: "/tmp/a.html" })).toBe(true);
    expect(isOfficialArtifactSurfaceInput({ action: "open" })).toBe(true);
    expect(isOfficialArtifactSurfaceInput({ action: "pin" })).toBe(false);
    expect(isOfficialArtifactSurfaceInput({ action: "list" })).toBe(false);
    expect(officialArtifactPinState({ action: "pin" })).toBe(true);
    expect(officialArtifactPinState({ action: "unpin" })).toBe(false);
  });

  it("extracts file_path from input and uses it as header (c52b meta)", () => {
    const filePath = "/tmp/deck.html";
    expect(officialArtifactFilePath({ file_path: filePath })).toBe(filePath);
    const extracted = extractOfficialArtifactSurface({
      input: { file_path: filePath },
      name: "Artifact",
      status: "completed",
    });
    expect(extracted?.filePath).toBe(filePath);
    expect(extracted?.header).toBe(filePath);
    expect(extracted?.isSurfaceInput).toBe(true);
  });

  it("prefers title in header when present, still keeps file_path", () => {
    const extracted = extractOfficialArtifactSurface({
      input: { file_path: "/tmp/deck.html", title: "Sprint deck" },
      name: "Artifact",
    });
    expect(extracted?.header).toBe("Sprint deck");
    expect(extracted?.filePath).toBe("/tmp/deck.html");
  });

  it("reads file_path / title from JSON output", () => {
    const extracted = extractOfficialArtifactSurface({
      input: {},
      name: "Artifact",
      output: JSON.stringify({ file_path: "/tmp/out.html", title: "From output" }),
    });
    expect(extracted?.filePath).toBe("/tmp/out.html");
    expect(extracted?.header).toBe("From output");
  });

  it("returns null for non-Artifact or empty path/title/url", () => {
    expect(extractOfficialArtifactSurface({ input: { file_path: "/tmp/a.html" }, name: "Bash" })).toBeNull();
    expect(extractOfficialArtifactSurface({ input: {}, name: "Artifact" })).toBeNull();
  });
});

describe("OfficialArtifactSurfaceCard kX DOM residual", () => {
  it("locks cd5a kX / c425 Sy Dy hy / c26fb Jhe classNames and file_path header attr", () => {
    const source = readFileSync(path.join(here, "OfficialArtifactSurfaceCard.tsx"), "utf8");
    expect(source).toContain(OFFICIAL_ARTIFACT_SOURCE_CD5A);
    expect(source).toContain(":kX");
    expect(source).toContain(OFFICIAL_ARTIFACT_KX_OUTER);
    expect(source).toContain("min-w-[318px]");
    expect(source).toContain(OFFICIAL_ARTIFACT_KX_ROW.split(" ").slice(0, 3).join(" "));
    expect(source).toContain(OFFICIAL_ARTIFACT_KX_CLICKABLE);
    expect(source).toContain('name="Artifacts"');
    expect(source).toContain('name="CaretRight"');
    expect(source).toContain("min-w-0 flex-1 text-body text-primary truncate");
    expect(source).toContain("data-artifact-file-path");
    expect(source).toContain(OFFICIAL_ARTIFACT_OPEN_LABEL_ID);
    expect(source).toContain(OFFICIAL_ARTIFACT_UNTITLED_ID);
    expect(source).toContain(OFFICIAL_ARTIFACT_SOURCE_C425);
    expect(source).toContain(OFFICIAL_ARTIFACT_SOURCE_C26FB);
    expect(source).toContain("onOpenPath");
    expect(source).not.toContain("startVmForPreview");
    expect(source).not.toContain("previewCleanup");
    expect(source).not.toContain("iframe");
  });

  it("returns null without path (card gates file_path after extract)", () => {
    const source = readFileSync(path.join(here, "OfficialArtifactSurfaceCard.tsx"), "utf8");
    expect(source).toMatch(/if \(!filePath\) return null/);
    expect(source).toMatch(/if \(!extracted\.isSurfaceInput\) return null/);
  });
});
