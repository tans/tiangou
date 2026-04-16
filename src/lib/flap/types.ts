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
  // Market cap in USD (estimated)
  marketCap?: number;
  // Whether token has Telegram group
  hasTgGroup?: boolean;
  // Tax details
  buyTax?: bigint;
  sellTax?: bigint;
  // Tax distribution breakdown (percentages as basis points, e.g., 500 = 5%)
  taxBurn?: number;
  taxDividend?: number;
  taxAddPool?: number;
  taxTreasury?: number;
  // External DEX (PancakeSwap) info
  poolAddress?: Address;
  poolReserveBnb?: bigint;
  poolReserveToken?: bigint;
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
  tgGroup?: string;
}

export interface PortalStreamEvent {
  id?: string;
  type: PortalEventType;
  token: Address;
  symbol?: string;
  name?: string;
  summary?: string;
  tooltip?: string;
  ts?: number;
  blockNumber?: bigint;
  txHash?: Address;
  details: Record<string, unknown>;
}
