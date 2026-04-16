import type { Address } from 'viem';
import { readContract } from 'viem/actions';
import { getPublicClient } from './flap/client';

// ERC20 ABI for symbol and name
const ERC20_TOKEN_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface TokenMeta {
  address: Address;
  symbol: string;
  name: string;
}

// In-memory cache
const symbolCache = new Map<Address, TokenMeta>();
const reverseCache = new Map<string, Address>();

// Default cache entries for common tokens (BNB chain)
const DEFAULT_TOKENS: TokenMeta[] = [
  {
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address,
    symbol: 'WBNB',
    name: 'Wrapped BNB',
  },
  {
    address: '0x55d398326f99059fF775485246999027B3197955' as Address,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  {
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  {
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd0873D6' as Address,
    symbol: 'BUSD',
    name: 'Binance USD',
  },
  {
    address: '0x0E09FaBB73Bd3ade0a17EC321f8B47E0F0Fc898' as Address,
    symbol: 'CAKE',
    name: 'PancakeSwap Token',
  },
];

// Initialize default tokens in cache
function initDefaultTokens() {
  for (const token of DEFAULT_TOKENS) {
    symbolCache.set(token.address, token);
    reverseCache.set(token.symbol.toUpperCase(), token.address);
  }
}

initDefaultTokens();

/**
 * Fetch token metadata from ERC20 contract
 */
async function fetchTokenMeta(address: Address): Promise<TokenMeta | null> {
  try {
    const publicClient = getPublicClient();

    const [symbol, name] = await Promise.all([
      readContract(publicClient, {
        address,
        abi: ERC20_TOKEN_ABI,
        functionName: 'symbol',
      }),
      readContract(publicClient, {
        address,
        abi: ERC20_TOKEN_ABI,
        functionName: 'name',
      }),
    ]);

    return { address, symbol, name };
  } catch (error) {
    console.error(`Failed to fetch token metadata for ${address}:`, error);
    return null;
  }
}

/**
 * Get token metadata by address
 * Uses local cache first, fetches from contract if not cached
 */
export async function getTokenMeta(address: Address): Promise<TokenMeta | null> {
  const normalizedAddress = address.toLowerCase() as Address;

  // Check cache first
  if (symbolCache.has(normalizedAddress)) {
    return symbolCache.get(normalizedAddress)!;
  }

  // Fetch from contract
  const meta = await fetchTokenMeta(normalizedAddress);
  if (meta) {
    symbolCache.set(normalizedAddress, meta);
    reverseCache.set(meta.symbol.toUpperCase(), normalizedAddress);
  }

  return meta;
}

/**
 * Get symbol by address
 */
export async function getSymbol(address: Address): Promise<string | null> {
  const meta = await getTokenMeta(address);
  return meta?.symbol ?? null;
}

/**
 * Get address by symbol
 */
export function getAddress(symbol: string): Address | null {
  return reverseCache.get(symbol.toUpperCase()) ?? null;
}

/**
 * Get all cached tokens
 */
export function getCachedTokens(): TokenMeta[] {
  return Array.from(symbolCache.values());
}

/**
 * Check if address is in cache
 */
export function isCached(address: Address): boolean {
  return symbolCache.has(address.toLowerCase() as Address);
}

/**
 * Check if symbol is in cache
 */
export function isSymbolCached(symbol: string): boolean {
  return reverseCache.has(symbol.toUpperCase());
}

/**
 * Pre-populate cache with known tokens
 */
export function preloadTokens(tokens: TokenMeta[]): void {
  for (const token of tokens) {
    symbolCache.set(token.address.toLowerCase() as Address, token);
    reverseCache.set(token.symbol.toUpperCase(), token.address.toLowerCase() as Address);
  }
}

/**
 * Clear all cached tokens (except defaults)
 */
export function clearCache(): void {
  const defaultAddresses = new Set(DEFAULT_TOKENS.map(t => t.address.toLowerCase()));

  for (const [address] of symbolCache) {
    if (!defaultAddresses.has(address.toLowerCase())) {
      symbolCache.delete(address);
    }
  }

  for (const [symbol, address] of reverseCache) {
    if (!defaultAddresses.has(address.toLowerCase())) {
      reverseCache.delete(symbol);
    }
  }
}
