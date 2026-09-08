/**
 * Official D1e transcript cache (index-BELzQL5P ~131430–131471, hydrate ~140154–140248).
 *
 *   lZe  31457280 (~30MB) total byte budget
 *   cZe  Map sessionId → { transcript, lastActivityAt, approxBytes }
 *   dZe  running byte total
 *   uZe  delete + subtract bytes
 *   pZe  write idle nonempty transcript; evict LRU while size>=5 or bytes overflow
 *   mZe  invalidate (= uZe)
 *   hZe  in-flight getTranscript Promise map
 *
 * Lookup: running sessions always miss. lastActivityAt uses !== (no coercion).
 * Hit LRU-touches via delete+set. Do NOT port Code Ae buckets.sub / De refCount.
 */

const COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET = 31_457_280;
const COWORK_TRANSCRIPT_CACHE_MAX_SESSIONS = 5;

type CoworkTranscriptCacheEntry = {
  approxBytes: number;
  lastActivityAt: unknown;
  transcript: readonly unknown[];
};

const transcriptCache = new Map<string, CoworkTranscriptCacheEntry>();
let transcriptCacheBytes = 0;
const inflightTranscriptFetches = new Map<string, Promise<unknown[] | null>>();

function approxTranscriptBytes(transcript: readonly unknown[]): number {
  let bytes = 0;
  for (const entry of transcript) {
    bytes += JSON.stringify(entry).length;
  }
  return bytes;
}

function deleteCachedTranscript(sessionId: string) {
  const entry = transcriptCache.get(sessionId);
  if (entry !== undefined) {
    transcriptCacheBytes -= entry.approxBytes;
    transcriptCache.delete(sessionId);
  }
}

/**
 * Official pZe: skip empty; drop self if larger than the whole budget;
 * otherwise evict LRU (Map insertion order) then insert.
 */
export function writeCoworkTranscriptCache(
  sessionId: string,
  transcript: readonly unknown[],
  lastActivityAt: unknown,
) {
  if (transcript.length === 0) return;
  const bytes = approxTranscriptBytes(transcript);
  if (bytes > COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET) {
    deleteCachedTranscript(sessionId);
    return;
  }
  for (
    deleteCachedTranscript(sessionId);
    transcriptCache.size >= COWORK_TRANSCRIPT_CACHE_MAX_SESSIONS
      || (transcriptCache.size > 1 && transcriptCacheBytes + bytes > COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET);

  ) {
    const oldest = transcriptCache.keys().next().value;
    if (oldest === undefined) break;
    deleteCachedTranscript(oldest);
  }
  transcriptCache.set(sessionId, {
    approxBytes: bytes,
    lastActivityAt,
    transcript,
  });
  transcriptCacheBytes += bytes;
}

/** Official mZe. */
export function invalidateCoworkTranscriptCache(sessionId: string) {
  deleteCachedTranscript(sessionId);
}

/**
 * Official lookup (~140154): running → null; mismatch → uZe + null;
 * hit → LRU touch (delete+set) + transcript.
 */
export function lookupCoworkTranscriptCache(
  sessionId: string,
  lastActivityAt: unknown,
  isRunning: boolean,
): readonly unknown[] | null {
  if (isRunning) return null;
  const entry = transcriptCache.get(sessionId);
  if (!entry) return null;
  if (entry.lastActivityAt !== lastActivityAt) {
    deleteCachedTranscript(sessionId);
    return null;
  }
  transcriptCache.delete(sessionId);
  transcriptCache.set(sessionId, entry);
  return entry.transcript;
}

/** Official hZe: same-id concurrent getTranscript share one Promise. */
export function coalesceCoworkTranscriptFetch(
  sessionId: string,
  fetchTranscript: () => Promise<unknown[] | null>,
): Promise<unknown[] | null> {
  const existing = inflightTranscriptFetches.get(sessionId);
  if (existing) return existing;
  const pending = fetchTranscript().finally(() => {
    inflightTranscriptFetches.delete(sessionId);
  });
  inflightTranscriptFetches.set(sessionId, pending);
  return pending;
}

/** Official D1e write gate: only idle misses with a nonempty transcript. */
export function maybeWriteCoworkTranscriptCache(
  sessionId: string,
  transcript: readonly unknown[] | null | undefined,
  lastActivityAt: unknown,
  isRunning: boolean,
  fromCache: boolean,
) {
  if (fromCache || isRunning || !transcript || transcript.length === 0) return;
  writeCoworkTranscriptCache(sessionId, transcript, lastActivityAt);
}

export function resetCoworkTranscriptCacheForTests() {
  transcriptCache.clear();
  transcriptCacheBytes = 0;
  inflightTranscriptFetches.clear();
}

export function coworkTranscriptCacheSizeForTests() {
  return transcriptCache.size;
}

export function coworkTranscriptCacheBytesForTests() {
  return transcriptCacheBytes;
}

export {
  COWORK_TRANSCRIPT_CACHE_BYTE_BUDGET,
  COWORK_TRANSCRIPT_CACHE_MAX_SESSIONS,
};
