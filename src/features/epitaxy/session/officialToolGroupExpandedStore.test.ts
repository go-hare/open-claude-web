import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dropOfficialToolGroupExpandedSession,
  officialExpandSessionLruSize,
  resetOfficialToolGroupExpandedStoreForTests,
  officialTaskRowExpanded,
  officialToolGroupDefaultExpanded,
  officialToolGroupExpanded,
  officialToolRowExpanded,
  setOfficialTaskRowExpanded,
  setOfficialToolGroupExpanded,
  setOfficialToolRowExpanded,
} from "./officialToolGroupExpandedStore";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official cc6e9624e dS group expand", () => {
  it("keeps expand across new tool ids (live append)", () => {
    setOfficialToolGroupExpanded("s1", "call-first", true);
    expect(officialToolGroupExpanded("s1", "call-first", false)).toBe(true);
    // Second Bash arriving does not change Te = first tool id.
    expect(officialToolGroupExpanded("s1", "call-first", false)).toBe(true);
  });

  it("qIe fS rows persist across remount (sidebar toggle)", () => {
    setOfficialToolRowExpanded("s1", "call-bash-1", true);
    expect(officialToolRowExpanded("s1", "call-bash-1", false)).toBe(true);
  });

  it("Tasks Vu map persists by taskId", () => {
    setOfficialTaskRowExpanded("s1", "bklqih1xm", true);
    expect(officialTaskRowExpanded("s1", "bklqih1xm", false)).toBe(true);
  });

  it("defaults closed unless a2e error auto-expand", () => {
    expect(officialToolGroupDefaultExpanded([{ isError: false }, { isError: false }])).toBe(false);
    expect(officialToolGroupDefaultExpanded([{ isError: true }])).toBe(true);
    expect(
      officialToolGroupDefaultExpanded(Array.from({ length: 9 }, () => ({ isError: true }))),
    ).toBe(false);
  });

  it("OfficialToolGroup uses dS first-tool key, not toolsKey reset", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/useOfficialToolGroupExpanded/);
    expect(source).toMatch(/officialToolGroupDefaultExpanded/);
    expect(source).not.toMatch(/const toolsKey = tools\.map/);
    expect(source).not.toMatch(/setExpanded\(false\);\n  \}, \[toolsKey\]/);
  });

  it("cc6e o LRU is 50 sessions; l(e) also drops key.endsWith(`:${e}`)", () => {
    resetOfficialToolGroupExpandedStoreForTests();
    for (let index = 0; index < 51; index += 1) {
      setOfficialToolGroupExpanded(`lru-${index}`, "g", true);
    }
    expect(officialExpandSessionLruSize()).toBe(50);
    expect(officialToolGroupExpanded("lru-0", "g", false)).toBe(false);
    expect(officialToolGroupExpanded("lru-50", "g", false)).toBe(true);
    setOfficialToolGroupExpanded("owner:dead", "g", true);
    dropOfficialToolGroupExpandedSession("dead");
    expect(officialToolGroupExpanded("owner:dead", "g", false)).toBe(false);
  });

  it("Zg row expand is useState(false) like c119 `[d,u]=e.useState(!1)`", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/const \[rowExpanded, setRowExpanded\] = useState\(false\)/);
    expect(source).not.toMatch(/useOfficialToolRowExpanded/);
    expect(source).not.toMatch(/if \(!isVerbose\) setExpanded\(false\)/);
  });
});

describe("official Jk Gk leaving face", () => {
  it("leaving morph face collapses width (chevron tracks incoming text)", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/w-0 overflow-hidden invisible/);
  });
});

