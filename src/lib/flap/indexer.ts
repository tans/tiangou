import { type Address } from 'viem';
import { getPublicClient } from './client';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID } from './constants';
import { FlapTokenFeedItem } from './types';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];

// One hour in milliseconds
const ONE_HOUR = 60 * 60 * 1000;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[], isInitial: boolean) => void) | null = null;
let historicalTokens: FlapTokenFeedItem[] = [];
let lastFetchTime = 0;

// Event types for Flap Portal
interface TokenCreatedEvent {
  ts: bigint;
  creator: Address;
  nonce: bigint;
  token: Address;
  name: string;
  symbol: string;
  meta: string;
}

interface TokenQuoteSetEvent {
  token: Address;
  quoteToken: Address;
}

interface FlapTokenTaxSetEvent {
  token: Address;
  tax: bigint;
}

interface TokenBoughtEvent {
  ts: bigint;
  token: Address;
  buyer: Address;
  amount: bigint;
  eth: bigint;
  fee: bigint;
  postPrice: bigint;
}

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
    name: 'TokenQuoteSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'quoteToken', indexed: false },
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
 * Fetch tokens from chain events
 */
async function fetchFromChainEvents(): Promise<FlapTokenFeedItem[]> {
  try {
    const publicClient = getPublicClient();
    const blockNumber = await publicClient.getBlockNumber();

    // BSC ~3s blocks, calculate ~1 hour ago
    const blocksPerHour = 1200;
    const fromBlock = blockNumber - BigInt(blocksPerHour * 2); // Get last 2 hours to be safe

    console.log(`[Indexer] Fetching TokenCreated events from block ${fromBlock} to ${blockNumber}`);

    // Get TokenCreated events
    const logs = await publicClient.getLogs({
      address: FLAP_PORTAL_ADDRESS as Address,
      event: FLAP_PORTAL_EVENTS[0], // TokenCreated
      fromBlock,
      toBlock: blockNumber,
    });

    console.log(`[Indexer] Found ${logs.length} TokenCreated events`);

    if (logs.length === 0) {
      return [];
    }

    // Get additional info for each token
    const tokens: FlapTokenFeedItem[] = [];

    for (const log of logs) {
      const args = log.args as any;

      // Skip if detectedAt is older than 1 hour
      const detectedAt = Number(args.ts) * 1000;
      if (detectedAt < Date.now() - ONE_HOUR) {
        continue;
      }

      tokens.push({
        address: args.token as Address,
        name: args.name || 'Unknown',
        symbol: args.symbol || '???',
        version: 'v1', // Will be updated if we can get version info
        isTaxToken: false, // Will be updated if we can get tax info
        quoteToken: '0x0000000000000000000000000000000000000000' as Address, // Default to BNB
        progress: 0,
        detectedAt,
        tradable: true,
      });
    }

    // Try to get TaxSet events to mark tax tokens
    try {
      const taxLogs = await publicClient.getLogs({
        address: FLAP_PORTAL_ADDRESS as Address,
        event: FLAP_PORTAL_EVENTS[2], // FlapTokenTaxSet
        fromBlock,
        toBlock: blockNumber,
      });

      console.log(`[Indexer] Found ${taxLogs.length} FlapTokenTaxSet events`);

      const taxTokens = new Set(taxLogs.map((l: any) => l.args.token as Address));
      const zeroTaxTokens = new Set<Address>();

      // Tokens with tax > 0 are tax tokens
      taxLogs.forEach((l: any) => {
        if (l.args.tax > 0n) {
          zeroTaxTokens.add(l.args.token);
        }
      });

      tokens.forEach((t) => {
        if (taxTokens.has(t.address)) {
          t.isTaxToken = zeroTaxTokens.has(t.address);
        }
      });
    } catch (e) {
      console.log('[Indexer] Could not fetch tax events:', e);
    }

    // Try to get LaunchedToDEX events
    try {
      const launchLogs = await publicClient.getLogs({
        address: FLAP_PORTAL_ADDRESS as Address,
        event: FLAP_PORTAL_EVENTS[3], // LaunchedToDEX
        fromBlock,
        toBlock: blockNumber,
      });

      const launchedTokens = new Set(launchLogs.map((l: any) => l.args.token as Address));

      tokens.forEach((t) => {
        if (launchedTokens.has(t.address)) {
          t.progress = 100; // Launched to DEX = 100% progress
        }
      });
    } catch (e) {
      console.log('[Indexer] Could not fetch launch events:', e);
    }

    return tokens;
  } catch (error) {
    console.error('[Indexer] Chain event fetch failed:', error);
    return [];
  }
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
  lastFetchTime = Date.now();

  const loadInitialData = async () => {
    console.log('[Indexer] Loading initial data from chain events...');

    const tokens = await fetchFromChainEvents();

    historicalTokens = tokens;
    lastFetchTime = Date.now();

    if (tokenFeedCallback) {
      console.log(`[Indexer] Initial load: ${tokens.length} tokens`);
      tokenFeedCallback(historicalTokens, true);
    }

    // Start polling for new tokens
    pollingInterval = setInterval(async () => {
      try {
        const publicClient = getPublicClient();
        const blockNumber = await publicClient.getBlockNumber();

        // Get events since last fetch
        const logs = await publicClient.getLogs({
          address: FLAP_PORTAL_ADDRESS as Address,
          event: FLAP_PORTAL_EVENTS[0], // TokenCreated
          fromBlock: blockNumber - 5n, // Last 5 blocks
          toBlock: blockNumber,
        });

        if (logs.length > 0) {
          console.log(`[Indexer] Found ${logs.length} new TokenCreated events`);

          const newTokens: FlapTokenFeedItem[] = logs.map((log) => {
            const args = log.args as any;
            return {
              address: args.token as Address,
              name: args.name || 'Unknown',
              symbol: args.symbol || '???',
              version: 'v1',
              isTaxToken: false,
              quoteToken: '0x0000000000000000000000000000000000000000' as Address,
              progress: 0,
              detectedAt: Number(args.ts) * 1000,
              tradable: true,
            };
          });

          historicalTokens = [...newTokens, ...historicalTokens].slice(0, 100);
          lastFetchTime = Date.now();

          if (tokenFeedCallback) {
            tokenFeedCallback(newTokens, false);
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
