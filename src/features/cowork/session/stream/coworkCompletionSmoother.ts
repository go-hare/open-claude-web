export type CoworkSmootherBlockOps<TBlock> = {
  applyDeltaEvent: (event: Record<string, unknown>, block: TBlock) => TBlock;
  blockSize: (block: TBlock) => number;
  createBlockFromStartEvent: (event: Record<string, unknown>) => TBlock | null;
  sliceBlock: (block: TBlock, size: number) => TBlock;
  stopBlockEvent: (event: Record<string, unknown>, block: TBlock) => TBlock;
};

const frameMs = 1000 / 60;

export class CoworkCompletionSmoother<TBlock> {
  alpha = 0.99;
  arrivals: Array<[number, number]> = [[-9999, 0]];
  blocksList: TBlock[] = [];
  blocksMutatedSinceLastDelivery = false;
  ceilReveal = false;
  dontSmooth = false;
  forceSmootherDone = false;
  gamma = 1e-5;
  generation = 0;
  modelDone = false;
  onCompletion?: (blocks: TBlock[]) => void;
  start = 0;
  t = 0;
  totalCompletionLength = 0;
  v = 100;
  x = 0;
  private blockIndexOffset = 0;
  private serverIndexBase: number | null = null;
  private unchanged = false;

  constructor(private readonly operations: CoworkSmootherBlockOps<TBlock>) {}

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
    this.unchanged = false;
    this.modelDone = false;
    this.forceSmootherDone = false;
    this.blocksMutatedSinceLastDelivery = false;
    this.blocksList = [];
    this.blockIndexOffset = 0;
    this.serverIndexBase = null;
  }

  finish() {
    this.modelDone = true;
  }

  onMessage(event: Record<string, unknown>) {
    const type = stringValue(event.type);
    if (type === "message_start" && this.blocksList.length > 0) {
      this.blockIndexOffset = this.blocksList.length;
      this.serverIndexBase = null;
    } else if (type === "content_block_start") {
      this.addBlock(event);
    } else if (type === "content_block_delta") {
      this.updateBlock(event, false);
    } else if (type === "content_block_stop") {
      this.updateBlock(event, true);
    } else if (type === "message_stop") {
      this.modelDone = true;
    }
    if (this.start === 0) this.start = Date.now();
    this.totalCompletionLength = this.blocksList.reduce((sum, block) => sum + this.operations.blockSize(block), 0);
    this.arrivals.push([(Date.now() - this.start) / 1000, this.totalCompletionLength]);
    if (this.dontSmooth && this.onCompletion) this.onCompletion(structuredClone(this.blocksList));
  }

  async task(deliver: (blocks: TBlock[]) => void, signal: AbortSignal) {
    const generation = this.generation;
    while (this.generation === generation && !this.smootherDone && !signal.aborted) {
      if (this.x >= this.totalCompletionLength && this.modelDone && !this.blocksMutatedSinceLastDelivery) break;
      if (this.blocksList.length > 0) {
        const smoothed = this.getSmoothedCompletion();
        if (!this.unchanged) deliver(smoothed);
      }
      await delay(frameMs);
    }
    if (this.generation === generation && !signal.aborted && this.blocksList.length > 0) {
      this.x = this.totalCompletionLength;
      this.blocksMutatedSinceLastDelivery = false;
      deliver(sliceBlocks(this.operations, this.blocksList, this.totalCompletionLength));
    }
  }

  private addBlock(event: Record<string, unknown>) {
    const block = this.operations.createBlockFromStartEvent(event);
    if (block === null) return;
    const index = numberValue(event.index);
    if (this.blockIndexOffset > 0 && this.serverIndexBase === null) this.serverIndexBase = index;
    this.blocksList.push(block);
  }

  private updateBlock(event: Record<string, unknown>, stopped: boolean) {
    const index = this.adjustedIndex(numberValue(event.index));
    const block = this.blocksList[index];
    if (!block) return;
    this.blocksList[index] = stopped
      ? this.operations.stopBlockEvent(event, block)
      : this.operations.applyDeltaEvent(event, block);
    if (stopped) this.blocksMutatedSinceLastDelivery = true;
  }

  private adjustedIndex(index: number) {
    if (this.blockIndexOffset === 0 || this.serverIndexBase === null) return index;
    return this.blockIndexOffset + (index - this.serverIndexBase);
  }

  private getSmoothedCompletion() {
    if (this.start === 0) return [];
    if (this.x >= this.totalCompletionLength) {
      this.unchanged = !this.blocksMutatedSinceLastDelivery;
      this.blocksMutatedSinceLastDelivery = false;
      return sliceBlocks(this.operations, this.blocksList, this.totalCompletionLength);
    }
    const elapsed = (Date.now() - this.start) / 1000;
    const maxChars = this.arrivals.at(-1)![1] + (this.modelDone || this.forceSmootherDone ? 100 : 0);
    const targetTime = 0.9 * elapsed - 0.3;
    const arrivals = this.arrivals.filter(([time]) => time < targetTime);
    const minChars = arrivals.at(-1)![1];
    const nextX = bisectLower((candidate) => this.velocityCost(candidate, elapsed, minChars, maxChars), minChars, maxChars);
    const velocity = (nextX - this.x) / (elapsed - this.t);
    this.v = this.alpha * this.v + (1 - this.alpha) * velocity;
    this.unchanged = this.x >= this.totalCompletionLength;
    this.x = Math.max(nextX, this.x);
    this.t = elapsed;
    return sliceBlocks(this.operations, this.blocksList, this.ceilReveal ? Math.ceil(this.x) : this.x);
  }

  private velocityCost(candidate: number, elapsed: number, minChars: number, maxChars: number) {
    const velocity = (candidate - this.x) / (elapsed - this.t);
    const invDt = 1 / (elapsed - this.t);
    const gamma = this.forceSmootherDone ? 0.01 * this.gamma : this.gamma;
    return 2 * gamma * invDt * (velocity - this.v) - 1 / (candidate - minChars) + 1 / (maxChars - candidate);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function sliceBlocks<TBlock>(ops: CoworkSmootherBlockOps<TBlock>, blocks: TBlock[], size: number) {
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
  if (lower >= upper || lowerValue > tolerance || upperValue < -tolerance) return lower;
  while (lowerValue < -tolerance) {
    const midpoint = (lower + upper) / 2;
    const value = fn(midpoint);
    if (value <= 0) {
      lower = midpoint;
      lowerValue = value;
    } else {
      upper = midpoint;
      upperValue = value;
    }
  }
  void upperValue;
  return lower;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
