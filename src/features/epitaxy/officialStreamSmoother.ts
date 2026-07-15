export type OfficialStreamBlock =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { id: string; kind: "tool"; name: string; partialJson: string };

export type OfficialStreamSnapshot = {
  blocks: OfficialStreamBlock[];
  messageId: string;
} | null;

type OfficialSmootherBlockOps<TBlock> = {
  applyDeltaEvent: (event: Record<string, unknown>, block: TBlock) => TBlock;
  blockSize: (block: TBlock) => number;
  createBlockFromStartEvent: (event: Record<string, unknown>) => TBlock | null;
  sliceBlock: (block: TBlock, size: number) => TBlock;
  stopBlockEvent: (event: Record<string, unknown>, block: TBlock) => TBlock;
};

const officialFrameMs = 1000 / 60;

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function sliceBlocks<TBlock>(ops: OfficialSmootherBlockOps<TBlock>, blocks: TBlock[], size: number) {
  if (size <= 0) return [];
  const sliced: TBlock[] = [];
  let consumed = 0;
  for (const block of blocks) {
    const blockSize = ops.blockSize(block);
    if (consumed + blockSize >= size) {
      sliced.push(ops.sliceBlock(block, size - consumed));
      break;
    }
    sliced.push(block);
    consumed += blockSize;
  }
  return sliced;
}

function bisectLower(fn: (value: number) => number, lower: number, upper: number, tolerance = 0.01) {
  if (lower === upper) return lower;
  let lowerValue = fn(lower);
  let upperValue = fn(upper);
  if (lower >= upper) throw new Error("Lower x is greater than upper x");
  if (lowerValue > tolerance) throw new Error("Lower f is greater than zero");
  if (upperValue < -tolerance) throw new Error("Upper f is less than zero");
  while (lowerValue < -tolerance) {
    const midpoint = (lower + upper) / 2;
    const midpointValue = fn(midpoint);
    if (midpointValue <= 0) {
      lower = midpoint;
      lowerValue = midpointValue;
    } else {
      upper = midpoint;
      upperValue = midpointValue;
    }
  }
  void upperValue;
  return lower;
}

class OfficialCompletionSmoother<TBlock> {
  alpha = 0.99;
  arrivals: Array<[number, number]> = [[-9999, 0]];
  blockIndexOffset = 0;
  blocksList: TBlock[] = [];
  blocksMutatedSinceLastDelivery = false;
  cachedVisibility = true;
  // Official zE default ceil_reveal=false; chat FE may flip via growthbook. Code path keeps default.
  ceilReveal = false;
  checkVisibility?: () => boolean;
  dontSmooth = false;
  forceSmootherDone = false;
  gamma = 1e-5;
  generation = 0;
  lastVisibilityCheck = 0;
  modelDone = false;
  onCompletion?: (blocks: TBlock[]) => void;
  serverIndexBase: number | null = null;
  smoothedCompletionIsUnchanged = false;
  start = 0;
  stats: Array<{ maxChars: number; minChars: number; t: number; v: number; x: number }> = [];
  t = 0;
  totalCompletionLength = 0;
  v = 100;
  x = 0;
  respectDocumentVisibility = false;

  constructor(private readonly blockOperations: OfficialSmootherBlockOps<TBlock>) {}

  get fullBlocks() {
    return this.blocksList;
  }

  get smootherDone() {
    return this.forceSmootherDone || (this.modelDone && this.x >= this.totalCompletionLength && !this.blocksMutatedSinceLastDelivery);
  }

  restart() {
    this.generation += 1;
    this.v = 100;
    this.x = 0;
    this.t = 0;
    this.arrivals = [[-9999, 0]];
    this.start = 0;
    this.totalCompletionLength = 0;
    this.smoothedCompletionIsUnchanged = false;
    this.modelDone = false;
    this.forceSmootherDone = false;
    this.blocksMutatedSinceLastDelivery = false;
    this.stats = [];
    this.blocksList = [];
    this.lastVisibilityCheck = 0;
    this.cachedVisibility = true;
    this.blockIndexOffset = 0;
    this.serverIndexBase = null;
  }

  finish() {
    this.modelDone = true;
  }

  onMessage(event: Record<string, unknown>) {
    switch (stringValue(event.type)) {
      case "message_start":
        if (this.blocksList.length > 0) {
          this.blockIndexOffset = this.blocksList.length;
          this.serverIndexBase = null;
        }
        break;
      case "content_block_start": {
        const block = this.blockOperations.createBlockFromStartEvent(event);
        if (block !== null) {
          const index = numberValue(event.index);
          if (this.blockIndexOffset > 0 && this.serverIndexBase === null) this.serverIndexBase = index;
          this.blocksList.push(block);
        }
        break;
      }
      case "content_block_delta": {
        const index = this.getAdjustedIndex(numberValue(event.index));
        const block = this.blocksList[index];
        if (!block) break;
        this.blocksList[index] = this.blockOperations.applyDeltaEvent(event, block);
        break;
      }
      case "content_block_stop": {
        const index = this.getAdjustedIndex(numberValue(event.index));
        const block = this.blocksList[index];
        if (!block) break;
        this.blocksList[index] = this.blockOperations.stopBlockEvent(event, block);
        this.blocksMutatedSinceLastDelivery = true;
        break;
      }
      case "message_stop":
        this.modelDone = true;
        break;
    }

    if (this.start === 0) this.start = Date.now();
    const totalLength = this.blocksList.reduce((sum, block) => sum + this.blockOperations.blockSize(block), 0);
    this.totalCompletionLength = totalLength;
    this.arrivals.push([(Date.now() - this.start) / 1000, totalLength]);
    if (this.dontSmooth && this.onCompletion) this.onCompletion(structuredClone(this.blocksList));
  }

  async task(deliver: (blocks: TBlock[]) => void, signal: AbortSignal) {
    // Official zE.task (index-BELzQL5P): 60fps reveal loop; document.hidden short-circuits;
    // no extra full deliver after the loop — flush/settle drives the final paint.
    const generation = this.generation;
    while (this.generation === generation && !this.smootherDone && !signal.aborted) {
      if (document.hidden) {
        if (this.modelDone) {
          this.x = this.totalCompletionLength;
          this.blocksMutatedSinceLastDelivery = false;
          deliver(sliceBlocks(this.blockOperations, this.blocksList, this.totalCompletionLength));
          break;
        }
        if (this.blocksMutatedSinceLastDelivery) {
          this.blocksMutatedSinceLastDelivery = false;
          deliver(sliceBlocks(this.blockOperations, this.blocksList, this.totalCompletionLength));
        }
        await delay(200);
        continue;
      }

      if (this.x >= this.totalCompletionLength && this.modelDone && !this.blocksMutatedSinceLastDelivery) break;
      if (this.blocksList.length > 0) {
        const smoothed = this.getSmoothedCompletion();
        if (!this.smoothedCompletionIsUnchanged) deliver(smoothed);
      }

      let isVisible = true;
      if (this.checkVisibility) {
        const now = Date.now();
        if (now - this.lastVisibilityCheck > 1000) {
          this.cachedVisibility = this.checkVisibility();
          this.lastVisibilityCheck = now;
        }
        isVisible = this.cachedVisibility;
      }
      await delay(isVisible ? officialFrameMs : 100);
    }
  }

  private getAdjustedIndex(index: number) {
    if (this.blockIndexOffset === 0 || this.serverIndexBase === null) return index;
    return this.blockIndexOffset + (index - this.serverIndexBase);
  }

  private getSmoothedCompletion() {
    if (this.start === 0) return [];
    if (this.x >= this.totalCompletionLength) {
      if (this.blocksMutatedSinceLastDelivery) {
        this.blocksMutatedSinceLastDelivery = false;
        this.smoothedCompletionIsUnchanged = false;
      } else {
        this.smoothedCompletionIsUnchanged = true;
      }
      return sliceBlocks(this.blockOperations, this.blocksList, this.totalCompletionLength);
    }

    // Official zE._get_smoothed_completion (index-BELzQL5P) — no local step caps.
    const elapsed = (Date.now() - this.start) / 1000;
    const maxChars = this.arrivals[this.arrivals.length - 1][1] + (this.modelDone || this.forceSmootherDone ? 100 : 0);
    const targetTime = 0.9 * elapsed - 0.3;
    const arrivalsBeforeDeadline = this.arrivals.filter((arrival) => arrival[0] < targetTime).map((arrival) => arrival[1]);
    const minChars = arrivalsBeforeDeadline[arrivalsBeforeDeadline.length - 1] ?? 0;
    if (!(maxChars > minChars) || !(elapsed > this.t) || minChars === undefined) {
      // Official throws on bad window; keep last x to avoid killing the 60fps task.
      this.smoothedCompletionIsUnchanged = true;
      return sliceBlocks(this.blockOperations, this.blocksList, this.ceilReveal ? Math.ceil(this.x) : this.x);
    }
    let nextX = minChars;
    try {
      nextX = bisectLower((candidate) => {
        const velocity = (candidate - this.x) / (elapsed - this.t);
        const invDt = 1 / (elapsed - this.t);
        return 2 * (this.forceSmootherDone ? 0.01 * this.gamma : this.gamma) * invDt * (velocity - this.v) - 1 / (candidate - minChars) + 1 / (maxChars - candidate);
      }, minChars, maxChars);
    } catch {
      this.smoothedCompletionIsUnchanged = true;
      return sliceBlocks(this.blockOperations, this.blocksList, this.ceilReveal ? Math.ceil(this.x) : this.x);
    }
    const velocity = (nextX - this.x) / (elapsed - this.t);
    this.v = this.alpha * this.v + (1 - this.alpha) * velocity;
    this.smoothedCompletionIsUnchanged = this.x >= this.totalCompletionLength;
    this.x = Math.max(nextX, this.x);
    this.t = elapsed;
    this.stats.push({ maxChars, minChars, t: elapsed, v: velocity, x: nextX });
    return sliceBlocks(this.blockOperations, this.blocksList, this.ceilReveal ? Math.ceil(this.x) : this.x);
  }
}

const officialBlockOps: OfficialSmootherBlockOps<OfficialStreamBlock> = {
  applyDeltaEvent(event, block) {
    const delta = asRecord(event.delta);
    const deltaType = stringValue(delta.type);
    if (block.kind === "text" && deltaType === "text_delta") return { kind: "text", text: block.text + (stringValue(delta.text) ?? "") };
    if (block.kind === "text" && deltaType === "connector_text_delta") return { kind: "text", text: block.text + (stringValue(delta.connector_text) ?? "") };
    if (block.kind === "tool" && deltaType === "input_json_delta") return { ...block, partialJson: block.partialJson + (stringValue(delta.partial_json) ?? "") };
    const thinking = thinkingDelta(event);
    if (block.kind === "thinking" && thinking !== null) return { kind: "thinking", text: block.text + thinking };
    return block;
  },
  blockSize(block) {
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
    if (block.kind === "text") return { kind: "text", text: block.text.slice(0, size) };
    return block;
  },
  stopBlockEvent(_event, block) {
    return block;
  },
};

export class OfficialSessionStreamSmoother {
  private abort = new AbortController();
  private cleared = true;
  private listeners = new Set<(snapshot: OfficialStreamSnapshot) => void>();
  private messageId = "";
  private settleCallbacks = new Set<() => void>();
  private smoother = new OfficialCompletionSmoother(officialBlockOps);

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

  /** Official Pke.setVisibility → smoother.checkVisibility */
  setVisibility(check: () => boolean) {
    this.smoother.checkVisibility = check;
  }

  feed(streamMessage: Record<string, unknown>) {
    // Official Pke.feed(sessionId, event, parent): if (null !== parent) return;
    if (streamMessage.parent_tool_use_id !== undefined && streamMessage.parent_tool_use_id !== null) return;
    const event = asRecord(streamMessage.event);
    const eventType = stringValue(event.type);
    if (eventType === "message_start") {
      // Official: messageId = event.message.id; cleared=false; restart; dont_smooth=false; on_completion=undefined; task(...)
      // generation++ on restart is what stops the prior loop (Pke does not AbortController.abort).
      const message = asRecord(event.message);
      this.messageId = stringValue(message.id) ?? stringValue(streamMessage.uuid) ?? `stream_${Date.now()}`;
      this.cleared = false;
      this.smoother.restart();
      this.smoother.dontSmooth = false;
      this.smoother.onCompletion = undefined;
      // Recreate signal without aborting mid-frame of the previous generation when possible.
      if (this.abort.signal.aborted) this.abort = new AbortController();
      const messageId = this.messageId;
      const generation = this.smoother.generation;
      const signal = this.abort.signal;
      void this.smoother.task((blocks) => {
        // Official Oke: only emit when blocks.length !== 0
        if (blocks.length > 0) this.emit({ blocks, messageId: this.messageId });
      }, signal).finally(() => {
        if (!this.cleared && this.messageId === messageId && this.smoother.generation === generation) this.notifySettled();
      });
      return;
    }
    if (!this.cleared) this.smoother.onMessage(event);
  }

  flush() {
    if (this.cleared) return;
    this.smoother.forceSmootherDone = true;
    this.smoother.onCompletion = (blocks) => this.emit({ blocks, messageId: this.messageId });
    this.smoother.dontSmooth = true;
    const blocks = this.smoother.fullBlocks;
    if (blocks.length > 0) this.emit({ blocks, messageId: this.messageId });
  }

  async settleAfterReveal(maxWaitMs = 8000) {
    if (this.cleared) return false;
    this.smoother.finish();
    const blocks = this.smoother.fullBlocks;
    if (!hasVisibleStreamBlocks(blocks)) return false;
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

  subscribe(listener: (snapshot: OfficialStreamSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(snapshot: OfficialStreamSnapshot) {
    for (const listener of this.listeners) listener(snapshot);
  }

  private notifySettled() {
    const callbacks = Array.from(this.settleCallbacks);
    this.settleCallbacks.clear();
    callbacks.forEach((callback) => callback());
  }
}

export function createOfficialSessionStreamSmoother() {
  return new OfficialSessionStreamSmoother();
}

function thinkingDelta(event: Record<string, unknown>) {
  const delta = asRecord(event.delta);
  return stringValue(delta.type) === "thinking_delta" ? stringValue(delta.thinking) ?? "" : null;
}

function hasVisibleStreamBlocks(blocks: OfficialStreamBlock[]) {
  return blocks.some((block) => {
    if (block.kind === "thinking") return false;
    if (block.kind === "text") return block.text.length > 0;
    return true;
  });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
