import { asRecord, numberValue, stringValue } from "../recordUtils";
import { CoworkCompletionSmoother, type CoworkSmootherBlockOps } from "./coworkCompletionSmoother";
import type { CoworkStreamBlock, CoworkStreamSnapshot } from "./coworkStreamTypes";

const blockOperations: CoworkSmootherBlockOps<CoworkStreamBlock> = {
  applyDeltaEvent(event, block) {
    const delta = asRecord(event.delta);
    const deltaType = stringValue(delta.type);
    if (block.kind === "text" && deltaType === "text_delta") return { kind: "text", text: block.text + (stringValue(delta.text) ?? "") };
    if (block.kind === "text" && deltaType === "connector_text_delta") return { kind: "text", text: block.text + (stringValue(delta.connector_text) ?? "") };
    if (block.kind === "tool" && deltaType === "input_json_delta") return { ...block, partialJson: block.partialJson + (stringValue(delta.partial_json) ?? "") };
    if (block.kind === "thinking" && deltaType === "thinking_delta") return { kind: "thinking", text: block.text + (stringValue(delta.thinking) ?? "") };
    return block;
  },
  blockSize(block) {
    // Official smoother sizes text/tool for reveal pacing; thinking is non-smoothed payload (size 0)
    // so full thinking text is delivered with the block rather than character-sliced.
    if (block.kind === "text") return block.text.length;
    if (block.kind === "tool") return 1 + block.partialJson.length;
    return 0;
  },
  createBlockFromStartEvent(event) {
    const contentBlock = asRecord(event.content_block);
    const type = stringValue(contentBlock.type);
    if (type === "tool_use") {
      return {
        id: stringValue(contentBlock.id) ?? `tool-${numberValue(event.index)}`,
        kind: "tool",
        name: stringValue(contentBlock.name) ?? "Tool",
        partialJson: "",
      };
    }
    if (type === "thinking") return { kind: "thinking", text: "" };
    if (type === "text" || type === "connector_text") return { kind: "text", text: "" };
    return null;
  },
  sliceBlock(block, size) {
    return block.kind === "text" ? { kind: "text", text: block.text.slice(0, size) } : block;
  },
  stopBlockEvent(_event, block) {
    return block;
  },
};

export class CoworkSessionStreamSmoother {
  private abort = new AbortController();
  private cleared = true;
  private listeners = new Set<(snapshot: CoworkStreamSnapshot) => void>();
  private messageId = "";
  private settleCallbacks = new Set<() => void>();
  private smoother = new CoworkCompletionSmoother(blockOperations);

  clear() {
    this.cleared = true;
    this.smoother.dontSmooth = false;
    this.smoother.onCompletion = undefined;
    this.smoother.restart();
    this.notifySettled();
    this.emit(null);
  }

  dispose() {
    this.abort.abort();
    this.listeners.clear();
    this.notifySettled();
  }

  feed(streamMessage: Record<string, unknown>) {
    if (streamMessage.parent_tool_use_id != null) return;
    const event = asRecord(streamMessage.event);
    if (stringValue(event.type) === "message_start") {
      this.startMessage(streamMessage, event);
      return;
    }
    if (!this.cleared) this.smoother.onMessage(event);
  }

  async settleAfterReveal(maxWaitMs = 8000) {
    if (this.cleared) return false;
    this.smoother.finish();
    const blocks = this.smoother.fullBlocks;
    if (!hasVisibleBlocks(blocks)) return false;
    if (this.smoother.smootherDone) {
      this.emit({ blocks, messageId: this.messageId });
      return true;
    }
    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (revealed: boolean) => {
        if (done) return;
        done = true;
        this.settleCallbacks.delete(onSettled);
        window.clearTimeout(timeout);
        resolve(revealed);
      };
      const onSettled = () => finish(true);
      const timeout = window.setTimeout(() => finish(false), maxWaitMs);
      this.settleCallbacks.add(onSettled);
    });
  }

  subscribe(listener: (snapshot: CoworkStreamSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private startMessage(streamMessage: Record<string, unknown>, event: Record<string, unknown>) {
    const message = asRecord(event.message);
    this.messageId = stringValue(message.id) ?? stringValue(streamMessage.uuid) ?? `stream_${Date.now()}`;
    this.cleared = false;
    this.abort.abort();
    this.abort = new AbortController();
    this.smoother.restart();
    const messageId = this.messageId;
    const generation = this.smoother.generation;
    void this.smoother.task((blocks) => {
      if (blocks.length > 0) this.emit({ blocks, messageId: this.messageId });
    }, this.abort.signal).finally(() => {
      if (!this.cleared && this.messageId === messageId && this.smoother.generation === generation) this.notifySettled();
    });
  }

  private emit(snapshot: CoworkStreamSnapshot) {
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private notifySettled() {
    const callbacks = [...this.settleCallbacks];
    this.settleCallbacks.clear();
    callbacks.forEach((callback) => callback());
  }
}

export function createCoworkSessionStreamSmoother() {
  return new CoworkSessionStreamSmoother();
}

function hasVisibleBlocks(blocks: CoworkStreamBlock[]) {
  return blocks.some((block) => block.kind === "tool" || block.kind === "text" && block.text.length > 0);
}
