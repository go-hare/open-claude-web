import { describe, expect, it } from "vitest";
import { shouldOfficialClickToFocus } from "./officialClickToFocus";

class FakeEl {
  readonly tagName: string;
  parentElement: FakeEl | null = null;
  private readonly kids: FakeEl[] = [];
  private readonly attrs = new Map<string, string>();

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }

  appendChild(child: FakeEl) {
    child.parentElement = this;
    this.kids.push(child);
    return child;
  }

  contains(other: FakeEl | null): boolean {
    if (!other) return false;
    if (other === this) return true;
    return this.kids.some((kid) => kid.contains(other));
  }

  closest(selector: string): FakeEl | null {
    const parts = selector.split(",").map((part) => part.trim());
    let current: FakeEl | null = this;
    while (current) {
      if (parts.some((part) => current!.matches(part))) return current;
      current = current.parentElement;
    }
    return null;
  }

  private matches(selector: string): boolean {
    if (selector === "[role]") return this.attrs.has("role");
    if (selector.startsWith("[") && selector.endsWith("]")) {
      const body = selector.slice(1, -1);
      const eq = body.indexOf("=");
      if (eq === -1) return this.attrs.has(body);
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1).replace(/^["']|["']$/g, "");
      return this.attrs.get(key) === value;
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
}

function clickEvent(container: FakeEl, target: FakeEl) {
  return {
    currentTarget: container as unknown as EventTarget,
    target: target as unknown as EventTarget,
  };
}

describe("official EYe clickToFocus", () => {
  it("fires when clicking empty container chrome", () => {
    const container = new FakeEl("div");
    const pad = new FakeEl("div");
    container.appendChild(pad);
    expect(shouldOfficialClickToFocus(clickEvent(container, pad))).toBe(true);
  });

  it("skips ProseMirror role=textbox (TipTap)", () => {
    const container = new FakeEl("div");
    const editor = new FakeEl("div");
    editor.setAttribute("role", "textbox");
    const p = new FakeEl("p");
    editor.appendChild(p);
    container.appendChild(editor);
    expect(shouldOfficialClickToFocus(clickEvent(container, p))).toBe(false);
    expect(shouldOfficialClickToFocus(clickEvent(container, editor))).toBe(false);
  });

  it("fires on role-less ProseMirror when an outer [role] is outside the container", () => {
    // Live packaged TipTap after setOptions drops createView's role="textbox".
    // closest("[role]") then hits dframe section[role=region] outside composer.
    const pane = new FakeEl("section");
    pane.setAttribute("role", "region");
    const container = new FakeEl("div");
    const editor = new FakeEl("div");
    editor.setAttribute("class", "tiptap ProseMirror");
    const p = new FakeEl("p");
    editor.appendChild(p);
    container.appendChild(editor);
    pane.appendChild(container);
    expect(shouldOfficialClickToFocus(clickEvent(container, p))).toBe(true);
  });

  it("skips buttons inside the container", () => {
    const container = new FakeEl("div");
    const button = new FakeEl("button");
    container.appendChild(button);
    expect(shouldOfficialClickToFocus(clickEvent(container, button))).toBe(false);
  });

  it("skips links, inputs, selects, textareas", () => {
    const container = new FakeEl("div");
    for (const tag of ["a", "input", "select", "textarea"] as const) {
      const el = new FakeEl(tag);
      container.appendChild(el);
      expect(shouldOfficialClickToFocus(clickEvent(container, el))).toBe(false);
    }
  });

  it("does not fire when target is outside currentTarget", () => {
    const container = new FakeEl("div");
    const outsider = new FakeEl("div");
    expect(shouldOfficialClickToFocus(clickEvent(container, outsider))).toBe(false);
  });

  it("fires when the only [role] is the container itself", () => {
    const container = new FakeEl("div");
    container.setAttribute("role", "group");
    const pad = new FakeEl("span");
    container.appendChild(pad);
    expect(shouldOfficialClickToFocus(clickEvent(container, container))).toBe(true);
  });
});
