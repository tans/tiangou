import { FlapTokenFeedItem } from './types';

// Flap API endpoint for token feed
const FLAP_API_URL = 'https://api.flap.com/feed/tokens';

/**
 * Mock token feed for development
 * In production, this would call the actual Flap API
 */
function getMockTokenFeed(): FlapTokenFeedItem[] {
  return [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Token A',
      symbol: 'TESTA',
      version: 'v2',
      isTaxToken: false,
      quoteToken: '0x0000000000000000000000000000000000000000',
      progress: 45,
      detectedAt: Date.now() - 60000,
      tradable: true,
    },
    {
      address: '0x2345678901234567890123456789012345678901',
      name: 'Tax Token B',
      symbol: 'TAXTB',
      version: 'v3',
      isTaxToken: true,
      quoteToken: '0x0000000000000000000000000000000000000000',
      progress: 72,
      detectedAt: Date.now() - 120000,
      tradable: true,
    },
    {
      address: '0x3456789012345678901234567890123456789012',
      name: 'New Token C',
      symbol: 'NEWC',
      version: 'v1',
      isTaxToken: false,
      quoteToken: '0x55d398326f99059fF775485246999027B3197955', // USDT
      progress: 20,
      detectedAt: Date.now() - 180000,
      tradable: true,
    },
  ];
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let tokenFeedCallback: ((tokens: FlapTokenFeedItem[]) => void) | null = null;

/**
 * Fetch current token feed
 */
export async function fetchTokenFeed(): Promise<FlapTokenFeedItem[]> {
  // In production, uncomment this:
  // const response = await fetch(FLAP_API_URL);
  // return response.json();

  // For now, return mock data
  return getMockTokenFeed();
}

/**
 * Start polling for new tokens
 */
export function startTokenFeedPolling(
  callback: (tokens: FlapTokenFeedItem[]) => void,
  intervalMs: number = 10000
): void {
  stopTokenFeedPolling();

  tokenFeedCallback = callback;

  // Initial fetch
  fetchTokenFeed().then(callback);

  // Start polling
  pollingInterval = setInterval(async () => {
    try {
      const tokens = await fetchTokenFeed();
      if (tokenFeedCallback) {
        tokenFeedCallback(tokens);
      }
    } catch (error) {
      console.error('Error fetching token feed:', error);
    }
  }, intervalMs);
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
