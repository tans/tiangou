import { parseEther, type Address } from 'viem';

import { useSniperStore } from '@/store/sniper';
import { FLAP_PORTAL_EVENTS } from './abi';
import { getPublicClient } from './client';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';
import { buildPortalEventSummary, mergeLatestCreatedTokens } from './portal-feed';
import { quoteExactInput } from './trading';
import type { FlapTokenFeedItem, LiveTokenQuote, PortalStreamEvent, PortalTokenMeta } from './types';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];
const ONE_HOUR = 60 * 60 * 1000;
const BLOCK_TIME = 3;
const BLOCKS_PER_HOUR = Math.floor(ONE_HOUR / 1000 / BLOCK_TIME);
const CHUNK_SIZE = 500n;
const PRICE_INPUT_AMOUNT = parseEther('0.01');
const PRICE_INPUT_BNB = 0.01;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[], isInitial: boolean) => void) | null = null;
let historicalTokens: FlapTokenFeedItem[] = [];
let lastFetchBlock = 0n;
const tokenMetaCache = new Map<Address, PortalTokenMeta>();

async function fetchLogsWithRetry(publicClient: ReturnType<typeof getPublicClient>, params: Record<string, unknown>, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await publicClient.getLogs(params as never);
    } catch (error: any) {
      const isRateLimit =
        error?.message?.includes('limit exceeded') ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('429');

      if (isRateLimit && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        continue;
      }

      throw error;
    }
  }

  return [];
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
  };
}

function toEventTime(ts: unknown): number {
  if (typeof ts === 'bigint') {
    return Number(ts) * 1000;
  }

  return Date.now();
}

function normalizeEvent(eventName: typeof FLAP_PORTAL_EVENTS[number]['name'], log: any): PortalStreamEvent {
  const args = log.args as Record<string, unknown>;
  const token = (args.token ?? '0x0000000000000000000000000000000000000000') as Address;
  const cachedMeta = tokenMetaCache.get(token);
  const symbol = (args.symbol as string | undefined) || cachedMeta?.symbol;
  const name = (args.name as string | undefined) || cachedMeta?.name;

  if (eventName === 'TokenCreated') {
    tokenMetaCache.set(token, {
      address: token,
      symbol: (args.symbol as string) || '???',
      name: (args.name as string) || 'Unknown',
      detectedAt: Number(args.ts ?? 0n) * 1000,
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

  return {
    ...event,
    summary: buildPortalEventSummary(event),
  };
}

function deriveCreatedTokens(events: PortalStreamEvent[]): FlapTokenFeedItem[] {
  const created = new Map<Address, FlapTokenFeedItem>();

  [...events]
    .sort((left, right) => (left.ts ?? 0) - (right.ts ?? 0))
    .forEach((event) => {
      if (event.type === 'TokenCreated') {
        const meta = tokenMetaCache.get(event.token);
        if (meta) {
          created.set(event.token, createFeedToken(meta));
        }
      }

      if (event.type === 'FlapTokenTaxSet' && created.has(event.token)) {
        const token = created.get(event.token)!;
        token.isTaxToken = (event.details.tax as bigint | undefined ?? 0n) > 0n;
        // For symmetric tax, both buy and sell tax are the same
        if (token.buyTax === undefined) {
          token.buyTax = event.details.tax as bigint | undefined;
        }
        if (token.sellTax === undefined) {
          token.sellTax = event.details.tax as bigint | undefined;
        }
      }

      if (event.type === 'FlapTokenAsymmetricTaxSet' && created.has(event.token)) {
        const token = created.get(event.token)!;
        token.isTaxToken =
          (event.details.buyTax as bigint | undefined ?? 0n) > 0n ||
          (event.details.sellTax as bigint | undefined ?? 0n) > 0n;
        token.buyTax = event.details.buyTax as bigint | undefined;
        token.sellTax = event.details.sellTax as bigint | undefined;
      }

      if (event.type === 'TokenQuoteSet' && created.has(event.token)) {
        const token = created.get(event.token)!;
        token.quoteToken = (event.details.quoteToken as Address | undefined) ?? token.quoteToken;
      }

      if (event.type === 'LaunchedToDEX' && created.has(event.token)) {
        const token = created.get(event.token)!;
        token.progress = 100;
        token.poolAddress = (event.details.pool as Address | undefined) ?? token.poolAddress;
      }
    });

  return Array.from(created.values()).sort((left, right) => right.detectedAt - left.detectedAt);
}

async function refreshLiveQuotes(tokens: PortalTokenMeta[]) {
  const targets = tokens.slice(0, 20);
  await Promise.all(targets.map(async (token) => {
    let quote: LiveTokenQuote;

    try {
      const outputAmount = await quoteExactInput(NATIVE_TOKEN_SENTINEL, token.address, PRICE_INPUT_AMOUNT);
      const normalizedOutput = Number(outputAmount) / 1e18;
      const priceInBnb = normalizedOutput > 0
        ? PRICE_INPUT_BNB / normalizedOutput
        : null;

      quote = {
        ...token,
        priceInBnb,
        quoteInputBnb: PRICE_INPUT_BNB,
        outputAmount,
        updatedAt: Date.now(),
        stale: false,
      };
    } catch {
      quote = {
        ...token,
        priceInBnb: null,
        quoteInputBnb: PRICE_INPUT_BNB,
        outputAmount: null,
        updatedAt: Date.now(),
        stale: true,
      };
    }

    useSniperStore.getState().upsertLiveQuote(quote);
  }));
}

async function fetchPortalSnapshot(fromBlock: bigint, toBlock: bigint) {
  const publicClient = getPublicClient();
  const events: PortalStreamEvent[] = [];

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;

    for (const event of FLAP_PORTAL_EVENTS) {
      try {
        const logs = await fetchLogsWithRetry(publicClient, {
          address: FLAP_PORTAL_ADDRESS,
          event,
          fromBlock: start,
          toBlock: end,
        });

        logs.forEach((log) => {
          events.push(normalizeEvent(event.name, log));
        });
      } catch (error) {
        console.error(`[Indexer] Failed fetching ${event.name} for ${start}-${end}:`, error);
      }
    }
  }

  const sortedEvents = events
    .filter((event) => (event.ts ?? 0) >= Date.now() - ONE_HOUR)
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
  const mergedLatest = mergeLatestCreatedTokens(store.latestCreatedTokens, snapshot.createdMeta);

  if (isInitial) {
    store.setPortalEvents(snapshot.events.slice(0, 100));
  } else if (snapshot.events.length > 0) {
    store.prependPortalEvents(snapshot.events);
  }

  if (snapshot.createdTokens.length > 0) {
    store.setLatestCreatedTokens(mergedLatest);
    await refreshLiveQuotes(mergedLatest);
  }

  historicalTokens = isInitial
    ? snapshot.createdTokens
    : mergeLatestCreatedTokens(
        historicalTokens.map((token) => ({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          detectedAt: token.detectedAt,
        })),
        snapshot.createdMeta,
      ).map(createFeedToken);
}

export function startTokenFeedPolling(
  callback: (tokens: FlapTokenFeedItem[], isInitial: boolean) => void,
  intervalMs = 5000,
): void {
  stopTokenFeedPolling();
  tokenFeedCallback = callback;

  const loadInitialData = async () => {
    try {
      const publicClient = getPublicClient();
      const blockNumber = await publicClient.getBlockNumber();
      const fromBlock = blockNumber - BigInt(Math.floor(BLOCKS_PER_HOUR / 2));
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
