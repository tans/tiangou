import { type Address } from 'viem';

import { useSniperStore } from '@/store/sniper';
import { FLAP_PORTAL_EVENTS } from './abi';
import { getPublicClient } from './client';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';
import { buildPortalEventSummary, mergeLatestCreatedTokens } from './portal-feed';
import type { FlapTokenFeedItem, PortalStreamEvent, PortalTokenMeta } from './types';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];
const HALF_HOUR = 30 * 60 * 1000;
// BSC ~3s/block: 30 min = 600 blocks, used for initial page-open fetch
const BLOCKS_PER_HALF_HOUR = 600;
const CHUNK_SIZE = 200n;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[], isInitial: boolean) => void) | null = null;
let historicalTokens: FlapTokenFeedItem[] = [];
let lastFetchBlock = 0n;
const tokenMetaCache = new Map<Address, PortalTokenMeta>();

async function fetchLogsWithRetry(
  publicClient: ReturnType<typeof getPublicClient>,
  params: Record<string, unknown>,
  retries = 3,
) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await publicClient.getLogs(params as never);
    } catch (error: any) {
      const isRateLimit =
        error?.message?.includes('limit exceeded') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('429') ||
        error?.message?.includes('request entity too large');

      if (isRateLimit && attempt < retries - 1) {
        const delay = 1000 * 2 ** attempt;
        console.log(`[Indexer] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  return [];
}

// Fetch all events in parallel for a given block range
async function fetchEventsForChunk(
  publicClient: ReturnType<typeof getPublicClient>,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<PortalStreamEvent[]> {
  // Fetch all event types in parallel
  const results = await Promise.allSettled(
    FLAP_PORTAL_EVENTS.map((event) =>
      fetchLogsWithRetry(publicClient, {
        address: FLAP_PORTAL_ADDRESS,
        event,
        fromBlock,
        toBlock,
      }).then((logs) => ({ event, logs }))
    )
  );

  const events: PortalStreamEvent[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[Indexer] Failed fetching ${FLAP_PORTAL_EVENTS[index].name} for ${fromBlock}-${toBlock}:`, result.reason);
    } else {
      const { event, logs } = result.value;
      logs.forEach((log) => {
        events.push(normalizeEvent(event.name, log));
      });
    }
  });

  return events;
}

function createFeedToken(meta: PortalTokenMeta): FlapTokenFeedItem {
  return {
    address: meta.address,
    name: meta.name,
    symbol: meta.symbol,
    version: 'v1',
    isTaxToken: false,
    quoteToken: NATIVE_TOKEN_SENTINEL,
    progress: 0,
    detectedAt: meta.detectedAt,
    tradable: true,
    hasTgGroup: !!meta.tgGroup,
  };
}

function toEventTime(ts: unknown): number {
  if (typeof ts === 'bigint') {
    return Number(ts) * 1000;
  }

  return Date.now();
}

function parseTokenMeta(metaStr: string | undefined): { tgGroup?: string } {
  if (!metaStr) return {};
  try {
    const meta = JSON.parse(metaStr);
    // Check for tg/telegram field in meta
    if (meta.tg || meta.telegram || meta.tgGroup) {
      return { tgGroup: meta.tg || meta.telegram || meta.tgGroup };
    }
    // Check socials object
    if (meta.socials?.telegram) {
      return { tgGroup: meta.socials.telegram };
    }
    if (meta.socials?.tg) {
      return { tgGroup: meta.socials.tg };
    }
    return {};
  } catch {
    return {};
  }
}

function normalizeEvent(eventName: typeof FLAP_PORTAL_EVENTS[number]['name'], log: any): PortalStreamEvent {
  const args = log.args as Record<string, unknown>;
  const token = (args.token ?? '0x0000000000000000000000000000000000000000') as Address;
  const cachedMeta = tokenMetaCache.get(token);
  const symbol = (args.symbol as string | undefined) || cachedMeta?.symbol;
  const name = (args.name as string | undefined) || cachedMeta?.name;

  if (eventName === 'TokenCreated') {
    const metaStr = args.meta as string | undefined;
    const { tgGroup } = parseTokenMeta(metaStr);
    // Only set symbol/name in cache if they are non-empty strings
    // This prevents caching '???'/'Unknown' and allows fallback to contract lookup
    const cachedSymbol = (args.symbol as string | undefined) || undefined;
    const cachedName = (args.name as string | undefined) || undefined;
    tokenMetaCache.set(token, {
      address: token,
      symbol: cachedSymbol || '',
      name: cachedName || '',
      detectedAt: Number(args.ts ?? 0n) * 1000 || Date.now(),
      tgGroup,
    });
  }

  const event: PortalStreamEvent = {
    id: `${log.transactionHash}-${log.logIndex}`,
    type: eventName,
    token,
    symbol,
    name,
    ts: toEventTime(args.ts),
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
    details: args,
  };

  const { summary, tooltip } = buildPortalEventSummary(event);

  return {
    ...event,
    summary,
    tooltip,
  };
}

function deriveCreatedTokens(events: PortalStreamEvent[]): FlapTokenFeedItem[] {
  const created = new Map<Address, FlapTokenFeedItem>();

  [...events]
    .sort((left, right) => (left.ts ?? 0) - (right.ts ?? 0))
    .forEach((event) => {
      // Check if this event belongs to a token we know about (from meta cache)
      // even if we don't have a TokenCreated event for it
      const existingToken = created.get(event.token);

      // Update existing token with event data
      if (existingToken) {
        if (event.type === 'FlapTokenTaxSet') {
          existingToken.isTaxToken = (event.details.tax as bigint | undefined ?? 0n) > 0n;
          if (existingToken.buyTax === undefined) {
            existingToken.buyTax = event.details.tax as bigint | undefined;
          }
          if (existingToken.sellTax === undefined) {
            existingToken.sellTax = event.details.tax as bigint | undefined;
          }
        }

        if (event.type === 'FlapTokenAsymmetricTaxSet') {
          existingToken.isTaxToken =
            (event.details.buyTax as bigint | undefined ?? 0n) > 0n ||
            (event.details.sellTax as bigint | undefined ?? 0n) > 0n;
          existingToken.buyTax = event.details.buyTax as bigint | undefined;
          existingToken.sellTax = event.details.sellTax as bigint | undefined;
        }

        if (event.type === 'TokenQuoteSet') {
          existingToken.quoteToken = (event.details.quoteToken as Address | undefined) ?? existingToken.quoteToken;
        }

        if (event.type === 'LaunchedToDEX') {
          existingToken.progress = 100;
          existingToken.poolAddress = (event.details.pool as Address | undefined) ?? existingToken.poolAddress;
        }

        if (event.type === 'TokenBought' || event.type === 'TokenSold') {
          // Token has trading activity - ensure it exists
          // This handles the case where TokenCreated was outside our historical window
          if (!existingToken) {
            const meta = tokenMetaCache.get(event.token);
            if (meta) {
              created.set(event.token, createFeedToken(meta));
            } else {
              // TokenCreated was outside window and not in cache - create minimal entry
              // The token will be properly enriched when full data is fetched
              const minimalToken: FlapTokenFeedItem = {
                address: event.token,
                name: 'Unknown',
                symbol: '???',
                version: 'v1',
                isTaxToken: false,
                quoteToken: NATIVE_TOKEN_SENTINEL,
                progress: 0,
                detectedAt: event.ts ?? Date.now(),
                tradable: true,
                hasTgGroup: false,
              };

              if (event.type === 'TokenBought') {
                minimalToken.buyTax = event.details.tax as bigint | undefined;
              } else {
                minimalToken.sellTax = event.details.tax as bigint | undefined;
              }

              created.set(event.token, minimalToken);
            }
          } else {
            // Update existing token with trading activity
            if (event.type === 'TokenBought' && existingToken.buyTax === undefined) {
              existingToken.buyTax = event.details.tax as bigint | undefined;
            }
            if (event.type === 'TokenSold' && existingToken.sellTax === undefined) {
              existingToken.sellTax = event.details.tax as bigint | undefined;
            }

            if (!existingToken.name || existingToken.name === 'Unknown') {
              const meta = tokenMetaCache.get(event.token);
              if (meta) {
                existingToken.name = meta.name;
                existingToken.symbol = meta.symbol;
              }
            }
          }
        }
      }

      if (event.type === 'TokenCreated') {
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          // Check if this is a new token or update existing
          const existing = created.get(event.token);
          if (existing) {
            // Update existing with new meta
            existing.name = meta.name;
            existing.symbol = meta.symbol;
            existing.detectedAt = meta.detectedAt;
            existing.hasTgGroup = !!meta.tgGroup;
          } else {
            // Create new token
            created.set(event.token, createFeedToken(meta));
          }
        }
      }

      if (event.type === 'FlapTokenTaxSet' && !created.has(event.token)) {
        // Token has tax event but no TokenCreated in window - check cache
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          const token = createFeedToken(meta);
          token.isTaxToken = (event.details.tax as bigint | undefined ?? 0n) > 0n;
          token.buyTax = event.details.tax as bigint | undefined;
          token.sellTax = event.details.tax as bigint | undefined;
          created.set(event.token, token);
        }
      }

      if (event.type === 'FlapTokenAsymmetricTaxSet' && !created.has(event.token)) {
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          const token = createFeedToken(meta);
          token.isTaxToken =
            (event.details.buyTax as bigint | undefined ?? 0n) > 0n ||
            (event.details.sellTax as bigint | undefined ?? 0n) > 0n;
          token.buyTax = event.details.buyTax as bigint | undefined;
          token.sellTax = event.details.sellTax as bigint | undefined;
          created.set(event.token, token);
        }
      }

      if (event.type === 'TokenBought' && !created.has(event.token)) {
        // Token has buy event but no TokenCreated in window - check cache
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          const token = createFeedToken(meta);
          created.set(event.token, token);
        }
      }

      if (event.type === 'TokenSold' && !created.has(event.token)) {
        // Token has sell event but no TokenCreated in window - check cache
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          const token = createFeedToken(meta);
          created.set(event.token, token);
        }
      }
    });

  return Array.from(created.values()).sort((left, right) => right.detectedAt - left.detectedAt);
}

async function fetchPortalSnapshot(fromBlock: bigint, toBlock: bigint) {
  const publicClient = getPublicClient();
  const events: PortalStreamEvent[] = [];

  // Process chunks in sequence (to avoid overwhelming the RPC)
  // But within each chunk, fetch all event types in parallel
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;

    try {
      const chunkEvents = await fetchEventsForChunk(publicClient, start, end);
      events.push(...chunkEvents);
    } catch (error) {
      console.error(`[Indexer] Failed fetching chunk ${start}-${end}:`, error);
    }
  }

  const sortedEvents = events
    .filter((event) => (event.ts ?? 0) >= Date.now() - HALF_HOUR)
    .sort((left, right) => (right.ts ?? 0) - (left.ts ?? 0));

  const createdTokens = deriveCreatedTokens(sortedEvents);
  const createdMeta = createdTokens.map<PortalTokenMeta>((token) => ({
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    detectedAt: token.detectedAt,
  }));

  return {
    events: sortedEvents,
    createdTokens,
    createdMeta,
  };
}

async function applySnapshot(
  snapshot: Awaited<ReturnType<typeof fetchPortalSnapshot>>,
  isInitial: boolean,
) {
  const store = useSniperStore.getState();
  const mergedLatest = mergeLatestCreatedTokens(store.latestCreatedTokens, snapshot.createdTokens);

  if (isInitial) {
    store.setPortalEvents(snapshot.events.slice(0, 100));
    console.log('[Indexer] setPortalEvents called with', snapshot.events.length, 'events');
  } else if (snapshot.events.length > 0) {
    store.prependPortalEvents(snapshot.events);
    console.log('[Indexer] prependPortalEvents called with', snapshot.events.length, 'events');
  }

  if (mergedLatest.length > 0) {
    store.setLatestCreatedTokens(mergedLatest);
  }

  // Debug: log portal events update (show state BEFORE and AFTER)
  console.log('[Indexer] applySnapshot', {
    isInitial,
    eventCount: snapshot.events.length,
    createdTokenCount: snapshot.createdTokens.length,
    portalEventsLengthBefore: store.portalEvents.length
  });

  historicalTokens = isInitial
    ? snapshot.createdTokens
    : mergeLatestCreatedTokens(
        historicalTokens,
        snapshot.createdTokens,
      );
}

export function startTokenFeedPolling(
  callback: (tokens: FlapTokenFeedItem[], isInitial: boolean) => void,
  intervalMs = 2500,
): void {
  stopTokenFeedPolling();
  tokenFeedCallback = callback;

  const loadInitialData = async () => {
    try {
      const publicClient = getPublicClient();
      const blockNumber = await publicClient.getBlockNumber();
      const fromBlock = blockNumber - BigInt(BLOCKS_PER_HALF_HOUR);
      const snapshot = await fetchPortalSnapshot(fromBlock, blockNumber);

      lastFetchBlock = blockNumber;
      await applySnapshot(snapshot, true);

      if (tokenFeedCallback) {
        tokenFeedCallback(snapshot.createdTokens, true);
      }
    } catch (error) {
      console.error('[Indexer] Initial load failed:', error);
    }

    pollingInterval = setInterval(async () => {
      try {
        const publicClient = getPublicClient();
        const blockNumber = await publicClient.getBlockNumber();

        if (blockNumber <= lastFetchBlock) {
          return;
        }

        const snapshot = await fetchPortalSnapshot(lastFetchBlock + 1n, blockNumber);
        lastFetchBlock = blockNumber;

        await applySnapshot(snapshot, false);

        if (tokenFeedCallback && snapshot.createdTokens.length > 0) {
          tokenFeedCallback(snapshot.createdTokens, false);
        }
      } catch (error) {
        console.error('[Indexer] Polling error:', error);
      }
    }, intervalMs);
  };

  void loadInitialData();
}

export function stopTokenFeedPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  tokenFeedCallback = null;
}

export function getHistoricalTokens(): FlapTokenFeedItem[] {
  return historicalTokens;
}
