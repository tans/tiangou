import { type Address } from 'viem';
import { getPublicClient } from './client';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID } from './constants';
import { FlapTokenFeedItem } from './types';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];

// Event signature for new token creation (if available in Flap Portal)
// In production, use the actual event signature from Flap
const NEW_TOKEN_EVENT = 'event NewToken(address indexed token, string name, string symbol, uint256 version)' as const;

// One hour in milliseconds
const ONE_HOUR = 60 * 60 * 1000;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[], isInitial: boolean) => void) | null = null;
let historicalTokens: FlapTokenFeedItem[] = [];
let lastFetchTime = 0;

/**
 * Fetch historical tokens from the last hour using on-chain events
 */
async function fetchHistoricalTokens(): Promise<FlapTokenFeedItem[]> {
  const now = Date.now();
  const oneHourAgo = now - ONE_HOUR;

  try {
    // Try to get logs from Flap Portal for NewToken events
    // This requires the Flap contract to emit NewToken events
    const logs = await getPublicClient().getLogs({
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
      fromBlock: BigInt(Math.floor((oneHourAgo / 1000) - 300)), // Start a bit earlier to be safe
      toBlock: 'latest',
    });

    const tokens: FlapTokenFeedItem[] = logs.map((log) => {
      const args = log.args;
      return {
        address: args.token as Address,
        name: (args.name as string) || 'Unknown',
        symbol: (args.symbol as string) || '???',
        version: `v${Number(args.version || 1)}`,
        isTaxToken: false, // Will be updated when inspecting
        quoteToken: '0x0000000000000000000000000000000000000000' as Address,
        progress: 0, // Will be updated
        detectedAt: Number(log.blockTimestamp || Date.now()) * 1000,
        tradable: true,
      };
    });

    return tokens;
  } catch (error) {
    console.error('Failed to fetch historical tokens from chain:', error);

    // Fallback: if no events available, return empty array
    // The monitoring will still work for new tokens
    return [];
  }
}

/**
 * Fetch current token feed from Flap API or chain
 */
async function fetchTokenFeed(): Promise<FlapTokenFeedItem[]> {
  try {
    // Try Flap API first (if available)
    const response = await fetch('https://api.flap.com/feed/tokens?limit=50', {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return data.tokens || [];
    }
  } catch {
    // API not available, fall through to chain-based approach
  }

  // Fallback: fetch from chain events
  // This gets NEW tokens created in real-time
  return fetchHistoricalTokens();
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

  // Initial fetch - get historical tokens first, then new ones
  const loadInitialData = async () => {
    try {
      // Fetch historical tokens (last 1 hour)
      const historical = await fetchHistoricalTokens();
      historicalTokens = historical;
      lastFetchTime = Date.now();

      if (tokenFeedCallback) {
        tokenFeedCallback(historicalTokens, true);
      }

      // Then start polling for new tokens
      pollingInterval = setInterval(async () => {
        try {
          // Fetch new tokens created since last fetch
          const newTokens = await fetchNewTokensSince(lastFetchTime);

          if (newTokens.length > 0) {
            // Add to historical list
            historicalTokens = [...newTokens, ...historicalTokens].slice(0, 100);
            lastFetchTime = Date.now();

            if (tokenFeedCallback) {
              tokenFeedCallback(newTokens, false);
            }
          }
        } catch (error) {
          console.error('Error polling token feed:', error);
        }
      }, intervalMs);
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Still start polling even if initial load fails
      pollingInterval = setInterval(async () => {
        try {
          const tokens = await fetchTokenFeed();
          if (tokenFeedCallback) {
            tokenFeedCallback(tokens, false);
          }
        } catch (err) {
          console.error('Error polling token feed:', err);
        }
      }, intervalMs);
    }
  };

  loadInitialData();
}

/**
 * Fetch new tokens created since a given timestamp
 */
async function fetchNewTokensSince(since: number): Promise<FlapTokenFeedItem[]> {
  const sinceTimestamp = Math.floor(since / 1000);

  try {
    // Get new logs from Flap Portal
    const logs = await getPublicClient().getLogs({
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
      fromBlock: 'latest', // Only get new blocks
      toBlock: 'latest',
    });

    const tokens: FlapTokenFeedItem[] = logs
      .filter(log => {
        const blockTime = Number(log.blockTimestamp || 0);
        return blockTime * 1000 > since;
      })
      .map((log) => {
        const args = log.args;
        return {
          address: args.token as Address,
          name: (args.name as string) || 'Unknown',
          symbol: (args.symbol as string) || '???',
          version: `v${Number(args.version || 1)}`,
          isTaxToken: false,
          quoteToken: '0x0000000000000000000000000000000000000000' as Address,
          progress: 0,
          detectedAt: Number(log.blockTimestamp || Date.now()) * 1000,
          tradable: true,
        };
      });

    return tokens;
  } catch (error) {
    // If event fetching fails, return empty (may happen if no NewToken event exists)
    return [];
  }
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
