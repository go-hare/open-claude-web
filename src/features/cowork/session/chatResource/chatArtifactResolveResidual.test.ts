/**
 * Residual: bare-id Chat artifact open must resolve content via normalized
 * CoworkChatMessage[] (path store / buildCoworkChatMessages), never by casting
 * CoworkMessageEnvelope[] to CoworkChatMessage[].
 */
import { describe, expect, it } from "vitest";
import {
  aggregateCoworkArtifacts,
  type CoworkArtifact,
} from "../transcript/coworkMessageArtifacts";
import { buildCoworkChatMessages } from "../transcript/coworkMessageModel";
import { createCoworkMessagePathStore } from "../transcript/coworkMessagePathStore";
import type { CoworkChatMessage } from "../transcript/coworkMessageTypes";
import type { CoworkRawMessage } from "../types";
import {
  isOfficialRichSandboxType,
  normalizeOfficialArtifactType,
  OFFICIAL_XM,
} from "../../../epitaxy/sandbox/officialSandboxConstants";

function assistantEnvelopeWithAntArtifact(
  id: string,
  type: string,
  body: string,
): CoworkRawMessage {
  const text = `<antArtifact identifier="${id}" type="${type}" title="Demo">${body}</antArtifact>`;
  return {
    id: `msg-${id}`,
    role: "assistant",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
    raw: {
      type: "assistant",
      uuid: `msg-${id}`,
      message: {
        id: `api-${id}`,
        role: "assistant",
        content: [{ type: "text", text }],
      },
    },
  };
}

function resolveViaPathOrNormalize(
  id: string,
  messages: CoworkRawMessage[],
  pathArtifacts: Record<string, CoworkArtifact>,
): CoworkArtifact | undefined {
  if (pathArtifacts[id]) return pathArtifacts[id];
  const chatMessages = buildCoworkChatMessages(messages, null);
  return aggregateCoworkArtifacts(chatMessages)[id];
}

describe("chat artifact resolve residual", () => {
  it("casting envelopes to CoworkChatMessage yields empty aggregate", () => {
    const envelopes = [
      assistantEnvelopeWithAntArtifact(
        "demo-html",
        "text/html",
        "<h1>hello</h1>",
      ),
    ];
    // Wrong path that previously shipped: cast envelopes as chat messages.
    const wrong = aggregateCoworkArtifacts(
      envelopes as unknown as CoworkChatMessage[],
    );
    expect(Object.keys(wrong)).toEqual([]);
  });

  it("buildCoworkChatMessages + aggregate recovers bare-id content", () => {
    const envelopes = [
      assistantEnvelopeWithAntArtifact(
        "demo-html",
        "text/html",
        "<h1>hello</h1>",
      ),
    ];
    const chatMessages = buildCoworkChatMessages(envelopes, null);
    expect(chatMessages.length).toBeGreaterThan(0);
    expect(chatMessages.some((m) => m.sender === "assistant")).toBe(true);
    const artifacts = aggregateCoworkArtifacts(chatMessages);
    const hit = artifacts["demo-html"];
    expect(hit).toBeDefined();
    expect(hit?.type).toBe("text/html");
    expect(hit?.versions.at(-1)?.resultState ?? hit?.versions.at(-1)?.content).toContain(
      "<h1>hello</h1>",
    );
  });

  it("path store artifacts serve bare-id open without re-normalize", () => {
    const envelopes = [
      assistantEnvelopeWithAntArtifact(
        "react-card",
        "application/vnd.ant.react",
        "export default function App(){return <div/>}",
      ),
    ];
    const chatMessages = buildCoworkChatMessages(envelopes, null);
    const store = createCoworkMessagePathStore();
    store.getState().setMessages("sess-1", chatMessages);
    const fromPath = store.getState().artifacts["react-card"];
    expect(fromPath).toBeDefined();
    const resolved = resolveViaPathOrNormalize(
      "react-card",
      envelopes,
      store.getState().artifacts,
    );
    expect(resolved?.id).toBe("react-card");
    expect(
      resolved?.versions.at(-1)?.resultState ?? resolved?.versions.at(-1)?.content,
    ).toContain("export default");
  });

  it("normalized type maps into g6e rich gate", () => {
    const type = normalizeOfficialArtifactType("application/vnd.ant.react");
    expect(type).toBe(OFFICIAL_XM.React);
    expect(isOfficialRichSandboxType(type)).toBe(true);
    expect(isOfficialRichSandboxType(OFFICIAL_XM.Code)).toBe(false);
    expect(isOfficialRichSandboxType(OFFICIAL_XM.Markdown)).toBe(false);
  });
});
