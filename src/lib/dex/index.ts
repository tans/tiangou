import { quoteExactInput as quoteFlap } from '../flap/trading';
import { quotePancakeSwapOutput as quotePancake } from './pancake';
import { BNB_MAINNET_CHAIN_ID } from './constants';

export { quotePancakeSwapOutput, quotePancakeSwapInput, sellTokenOnPancake, buyTokenOnPancake } from './pancake';

export interface DexQuote {
  dex: 'flap' | 'pancake';
  outputAmount: bigint;
  priceInBnb: number;
}

/**
 * Compare quotes from internal (Flap) and external (PancakeSwap) DEX
 * Returns the better venue for selling
 */
export async function compareSellQuotes(
  tokenAddress: string,
  tokenAmount: bigint
): Promise<{ flap: DexQuote; pancake: DexQuote; betterVenue: 'flap' | 'pancake' }> {
  const [flapQuote, pancakeQuote] = await Promise.all([
    quoteFlap(tokenAddress, '0x0000000000000000000000000000000000000000', tokenAmount),
    quotePancake(tokenAddress, tokenAmount),
  ]);

  const flapPriceInBnb = Number(flapQuote) / 1e18;
  const pancakePriceInBnb = Number(pancakeQuote) / 1e18;

  const flap: DexQuote = {
    dex: 'flap',
    outputAmount: flapQuote,
    priceInBnb: flapPriceInBnb,
  };

  const pancake: DexQuote = {
    dex: 'pancake',
    outputAmount: pancakeQuote,
    priceInBnb: pancakePriceInBnb,
  };

  // Choose the venue with higher output
  const betterVenue = pancakeQuote > flapQuote ? 'pancake' : 'flap';

  return { flap, pancake, betterVenue };
}

/**
 * Get external DEX availability status
 * Some tokens may not be listed on PancakeSwap yet
 */
export async function isTokenOnPancakeSwap(tokenAddress: string, tokenAmount: bigint): Promise<boolean> {
  try {
    const quote = await quotePancake(tokenAddress, tokenAmount);
    return quote > 0n;
  } catch {
    return false;
  }
}

/**
 * Calculate price difference percentage between venues
 * Positive = external DEX is better, Negative = internal DEX is better
 */
export function calculatePriceDiff(flapQuote: DexQuote, pancakeQuote: DexQuote): number {
  if (flapQuote.priceInBnb === 0) return 0;
  return ((pancakeQuote.priceInBnb - flapQuote.priceInBnb) / flapQuote.priceInBnb) * 100;
}
