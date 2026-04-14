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

export type PortalEventType =
  | 'TokenCreated'
  | 'TokenQuoteSet'
  | 'TokenCurveSetV2'
  | 'TokenDexSupplyThreshSet'
  | 'FlapTokenTaxSet'
  | 'FlapTokenAsymmetricTaxSet'
  | 'TokenBought'
  | 'TokenSold'
  | 'LaunchedToDEX';

export interface PortalTokenMeta {
  address: Address;
  symbol: string;
  name: string;
  detectedAt: number;
}

export interface PortalStreamEvent {
  id?: string;
  type: PortalEventType;
  token: Address;
  symbol?: string;
  name?: string;
  summary?: string;
  ts?: number;
  blockNumber?: bigint;
  txHash?: Address;
  details: Record<string, unknown>;
}

export interface LiveTokenQuote extends PortalTokenMeta {
  priceInBnb: number | null;
  quoteInputBnb: number | null;
  outputAmount: bigint | null;
  updatedAt: number | null;
  stale: boolean;
}
