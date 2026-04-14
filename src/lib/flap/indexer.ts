import { type Address } from 'viem';
import { getPublicClient } from './client';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID } from './constants';
import { FlapTokenFeedItem } from './types';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];

// One hour in milliseconds
const ONE_HOUR = 60 * 60 * 1000;

// BSC has ~3s blocks
const BLOCK_TIME = 3;
const BLOCKS_PER_HOUR = Math.floor(ONE_HOUR / 1000 / BLOCK_TIME); // ~1200 blocks

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[], isInitial: boolean) => void) | null = null;
let historicalTokens: FlapTokenFeedItem[] = [];
let lastFetchBlock = BigInt(0);

// ABI for Flap Portal - key events
const FLAP_PORTAL_EVENTS = [
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { type: 'uint256', name: 'ts', indexed: false },
      { type: 'address', name: 'creator', indexed: true },
      { type: 'uint256', name: 'nonce', indexed: false },
      { type: 'address', name: 'token', indexed: true },
      { type: 'string', name: 'name', indexed: false },
      { type: 'string', name: 'symbol', indexed: false },
      { type: 'string', name: 'meta', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FlapTokenTaxSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'uint256', name: 'tax', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LaunchedToDEX',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'pool', indexed: false },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'eth', indexed: false },
    ],
  },
] as const;

/**
 * Fetch logs with retry logic for rate limits
 */
async function fetchLogsWithRetry(
  publicClient: any,
  params: any,
  retries = 3
): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    try {
      return await publicClient.getLogs(params);
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('limit exceeded') ||
                          error?.message?.includes('rate limit') ||
                          error?.message?.includes('429');

      if (isRateLimit && i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        console.log(`[Indexer] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return [];
}

/**
 * Fetch tokens from chain events with chunked queries
 */
async function fetchFromChainEvents(fromBlock: bigint, toBlock: bigint): Promise<FlapTokenFeedItem[]> {
  const publicClient = getPublicClient();

  // BSC RPC limit is typically ~1000 blocks per query
  // Use 500 blocks per chunk to be safe
  const CHUNK_SIZE = 500n;
  const tokens: FlapTokenFeedItem[] = [];

  console.log(`[Indexer] Fetching from block ${fromBlock} to ${toBlock} (chunked)`);

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;

    try {
      // Get TokenCreated events
      const logs = await fetchLogsWithRetry(publicClient, {
        address: FLAP_PORTAL_ADDRESS as Address,
        event: FLAP_PORTAL_EVENTS[0],
        fromBlock: start,
        toBlock: end,
      });

      for (const log of logs) {
        const args = log.args as any;
        const detectedAt = Number(args.ts) * 1000;

        // Skip if older than 1 hour
        if (detectedAt < Date.now() - ONE_HOUR) continue;

        tokens.push({
          address: args.token as Address,
          name: args.name || 'Unknown',
          symbol: args.symbol || '???',
          version: 'v1',
          isTaxToken: false,
          quoteToken: '0x0000000000000000000000000000000000000000' as Address,
          progress: 0,
          detectedAt,
          tradable: true,
        });
      }

      // Small delay between chunks to avoid rate limit
      if (start + CHUNK_SIZE <= toBlock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.log(`[Indexer] Chunk ${start}-${end} failed:`, error);
      continue;
    }
  }

  console.log(`[Indexer] Found ${tokens.length} tokens in ${tokens.length > 0 ? 'chunks' : 'range'}`);

  // Get TaxSet events for these tokens
  if (tokens.length > 0) {
    try {
      const taxLogs = await fetchLogsWithRetry(publicClient, {
        address: FLAP_PORTAL_ADDRESS as Address,
        event: FLAP_PORTAL_EVENTS[1],
        fromBlock,
        toBlock,
      });

      const taxTokenMap = new Map<Address, boolean>();
      taxLogs.forEach((l: any) => {
        if (l.args.tax > 0n) {
          taxTokenMap.set(l.args.token, true);
        }
      });

      tokens.forEach(t => {
        if (taxTokenMap.has(t.address)) {
          t.isTaxToken = true;
        }
      });
    } catch (e) {
      console.log('[Indexer] Could not fetch tax events');
    }

    // Get LaunchedToDEX events
    try {
      const launchLogs = await fetchLogsWithRetry(publicClient, {
        address: FLAP_PORTAL_ADDRESS as Address,
        event: FLAP_PORTAL_EVENTS[2],
        fromBlock,
        toBlock,
      });

      const launchedSet = new Set(launchLogs.map((l: any) => l.args.token as Address));
      tokens.forEach(t => {
        if (launchedSet.has(t.address)) {
          t.progress = 100;
        }
      });
    } catch (e) {
      console.log('[Indexer] Could not fetch launch events');
    }
  }

  return tokens;
}

/**
 * Start polling for new tokens
 */
export function startTokenFeedPolling(
  callback: (tokens: FlapTokenFeedItem[], isInitial: boolean) => void,
  intervalMs: number = 5000
): void {
  stopTokenFeedPolling();

  tokenFeedCallback = callback;

  const loadInitialData = async () => {
    console.log('[Indexer] Loading initial data...');

    try {
      const publicClient = getPublicClient();
      const blockNumber = await publicClient.getBlockNumber();

      // Start from 30 minutes ago to avoid rate limits
      const fromBlock = blockNumber - BigInt(Math.floor(BLOCKS_PER_HOUR / 2));
      const toBlock = blockNumber;

      const tokens = await fetchFromChainEvents(fromBlock, toBlock);

      historicalTokens = tokens;
      lastFetchBlock = blockNumber;

      if (tokenFeedCallback) {
        console.log(`[Indexer] Initial load: ${tokens.length} tokens`);
        tokenFeedCallback(historicalTokens, true);
      }
    } catch (error) {
      console.error('[Indexer] Initial load failed:', error);
    }

    // Start polling for new blocks
    pollingInterval = setInterval(async () => {
      try {
        const publicClient = getPublicClient();
        const blockNumber = await publicClient.getBlockNumber();

        // Only fetch new blocks
        if (blockNumber > lastFetchBlock) {
          const newTokens = await fetchFromChainEvents(lastFetchBlock + 1n, blockNumber);

          if (newTokens.length > 0) {
            console.log(`[Indexer] Found ${newTokens.length} new tokens`);
            historicalTokens = [...newTokens, ...historicalTokens].slice(0, 100);
            lastFetchBlock = blockNumber;

            if (tokenFeedCallback) {
              tokenFeedCallback(newTokens, false);
            }
          } else {
            lastFetchBlock = blockNumber;
          }
        }
      } catch (error) {
        console.error('[Indexer] Polling error:', error);
      }
    }, intervalMs);
  };

  loadInitialData();
}

/**
 * Stop polling for new tokens
 */
export function stopTokenFeedPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  tokenFeedCallback = null;
}

/**
 * Get all historical tokens
 */
export function getHistoricalTokens(): FlapTokenFeedItem[] {
  return historicalTokens;
}
