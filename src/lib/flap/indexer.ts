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
let lastBlockFetched = BigInt(0);

/**
 * Generate mock tokens for testing (since Flap may not have public events)
 * In production, replace with actual Flap API or contract calls
 */
function generateMockTokens(count: number, withinLastHour: boolean): FlapTokenFeedItem[] {
  const now = Date.now();
  const tokens: FlapTokenFeedItem[] = [];
  const names = ['PEPE', 'WOJAK', 'CHAD', 'SHIBA', 'DOGE', 'FLOKI', 'ELON', 'BABYDOGE', 'AI', 'TABOO', 'KOKO', 'PANDORA'];
  const mockAddresses = [
    '0x6982508145454Ce325dDbE47a25d4ec3d2311933', // PEPE
    '0x8Fd5a2b8a0b5aC3B1dC1dC8E5B2A8F9C3D1E4F6A', // mock
    '0x2a2C8dA9b7C5e4F3A1B0d9E8c7B6A5f4E3D2C1B',
    '0x3B3c5D6B4c6E5F4A2B1C0D9E8f7A6B5C4D3E2F1',
    '0x4C4d6E7F5D6C4B3A2F1E0D9c8B7A6F5E4D3C2B',
    '0x5D5e7F6E6D5C4B3A2F1E0D9c8B7A6F5E4D3C2B1',
  ];

  for (let i = 0; i < count; i++) {
    const age = withinLastHour ? Math.random() * ONE_HOUR : ONE_HOUR + Math.random() * ONE_HOUR * 2;
    const version = `v${Math.floor(Math.random() * 5) + 1}`;
    const versionNum = parseInt(version.replace('v', ''));

    tokens.push({
      address: mockAddresses[i % mockAddresses.length],
      name: names[i % names.length],
      symbol: names[i % names.length].substring(0, 4),
      version,
      isTaxToken: i % 3 === 0,
      quoteToken: '0x0000000000000000000000000000000000000000' as Address,
      progress: Math.floor(Math.random() * 100),
      detectedAt: now - age,
      tradable: Math.random() > 0.2,
    });
  }

  return tokens;
}

/**
 * Fetch tokens from Flap API
 */
async function fetchFromFlapApi(): Promise<FlapTokenFeedItem[]> {
  try {
    const response = await fetch('https://api.flap.com/feed/tokens?limit=50', {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.tokens && Array.isArray(data.tokens)) {
        return data.tokens.map((t: any) => ({
          address: t.address as Address,
          name: t.name || 'Unknown',
          symbol: t.symbol || '???',
          version: `v${t.version || 1}`,
          isTaxToken: t.isTaxToken || false,
          quoteToken: (t.quoteToken || '0x0000000000000000000000000000000000000000') as Address,
          progress: t.progress || 0,
          detectedAt: t.detectedAt || Date.now(),
          tradable: t.tradable !== false,
        }));
      }
    }
  } catch {
    // API not available
  }
  return [];
}

/**
 * Try to fetch NewToken events from Flap Portal
 */
async function fetchFromChainEvents(): Promise<FlapTokenFeedItem[]> {
  try {
    const publicClient = getPublicClient();

    // Try to get the current block number
    const blockNumber = await publicClient.getBlockNumber();
    const oneHourAgo = Math.floor((Date.now() - ONE_HOUR) / 1000);

    // Calculate approximate block number for 1 hour ago (BSC ~3s blocks)
    const blocksPerHour = 1200;
    const fromBlock = blockNumber - BigInt(blocksPerHour);

    console.log(`[Indexer] Fetching events from block ${fromBlock} to ${blockNumber}`);

    // Try NewToken event
    let logs: any[] = [];
    try {
      logs = await publicClient.getLogs({
        address: FLAP_PORTAL_ADDRESS as Address,
        event: {
          type: 'event',
          name: 'NewToken',
          inputs: [
            { type: 'address', name: 'token', indexed: true },
            { type: 'string', name: 'name' },
            { type: 'string', name: 'symbol' },
            { type: 'uint256', name: 'version' },
          ],
        },
        fromBlock,
        toBlock: blockNumber,
      });
      console.log(`[Indexer] Found ${logs.length} NewToken events`);
    } catch (e) {
      console.log(`[Indexer] NewToken event failed, trying alternative...`);
    }

    // If no NewToken events, try PairCreated (Uniswap-style)
    if (logs.length === 0) {
      try {
        logs = await publicClient.getLogs({
          address: FLAP_PORTAL_ADDRESS as Address,
          event: {
            type: 'event',
            name: 'PairCreated',
            inputs: [
              { type: 'address', name: 'token0', indexed: true },
              { type: 'address', name: 'token1', indexed: true },
              { type: 'address', name: 'pair', indexed: false },
              { type: 'uint256', name: 'version' },
            ],
          },
          fromBlock,
          toBlock: blockNumber,
        });
        console.log(`[Indexer] Found ${logs.length} PairCreated events`);
      } catch (e) {
        console.log(`[Indexer] PairCreated event also failed`);
      }
    }

    if (logs.length === 0) {
      return [];
    }

    return logs.map((log: any) => {
      const args = log.args;
      return {
        address: args.token || args.pair || '0x0000000000000000000000000000000000000000',
        name: args.name || 'Unknown Token',
        symbol: args.symbol || '???',
        version: `v${Number(args.version || 1)}`,
        isTaxToken: false,
        quoteToken: '0x0000000000000000000000000000000000000000' as Address,
        progress: 0,
        detectedAt: Number(log.blockTimestamp || Date.now()) * 1000,
        tradable: true,
      };
    });
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
    console.log('[Indexer] Loading initial data...');

    // Try Flap API first
    let tokens = await fetchFromFlapApi();

    // If API fails, try chain events
    if (tokens.length === 0) {
      console.log('[Indexer] API returned no tokens, trying chain events...');
      tokens = await fetchFromChainEvents();
    }

    // If still no tokens, use mock data for demo (remove in production)
    if (tokens.length === 0) {
      console.log('[Indexer] Using mock data for demo');
      tokens = generateMockTokens(10, true);
    }

    historicalTokens = tokens;
    lastFetchTime = Date.now();

    if (tokenFeedCallback) {
      console.log(`[Indexer] Initial load: ${tokens.length} tokens`);
      tokenFeedCallback(historicalTokens, true);
    }

    // Start polling for new tokens
    pollingInterval = setInterval(async () => {
      try {
        // Try API first
        let newTokens = await fetchFromFlapApi();

        // If API fails, try chain events
        if (newTokens.length === 0) {
          newTokens = await fetchFromChainEvents();
        }

        // Filter out tokens we already have
        if (newTokens.length > 0) {
          const existingAddresses = new Set(historicalTokens.map(t => t.address));
          const uniqueNewTokens = newTokens.filter(t => !existingAddresses.has(t.address));

          if (uniqueNewTokens.length > 0) {
            console.log(`[Indexer] Found ${uniqueNewTokens.length} new tokens`);
            historicalTokens = [...uniqueNewTokens, ...historicalTokens].slice(0, 100);
            lastFetchTime = Date.now();

            if (tokenFeedCallback) {
              tokenFeedCallback(uniqueNewTokens, false);
            }
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
