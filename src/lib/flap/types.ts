import type { Address } from 'viem';

export interface FlapTokenFeedItem {
  address: Address;
  name: string;
  symbol: string;
  version: string;
  isTaxToken: boolean;
  quoteToken: Address;
  progress: number;
  detectedAt: number;
  tradable: boolean;
}
