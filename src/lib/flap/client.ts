import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';

// BNB Chain configuration
const bnbChain = {
  ...bsc,
  id: BNB_MAINNET_CHAIN_ID,
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org/'] },
    public: { http: ['https://bsc-dataseed.binance.org/'] },
  },
};

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: bnbChain,
  transport: http(),
});

// Wallet client type
export type FlapWalletClient = ReturnType<typeof createWalletClient>;

// Current wallet account
let currentAccount: ReturnType<typeof privateKeyToAccount> | null = null;
export let walletClient: FlapWalletClient | null = null;

/**
 * Initialize wallet client with private key
 * @param privateKey - Hex string (with or without 0x prefix)
 */
export function initWalletClient(privateKey: string): void {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  currentAccount = privateKeyToAccount(key as `0x${string}`);

  walletClient = createWalletClient({
    account: currentAccount,
    chain: bnbChain,
    transport: http(),
  });
}

/**
 * Get current account address
 */
export function getAccountAddress(): string | null {
  return currentAccount?.address ?? null;
}

/**
 * Check if wallet is connected
 */
export function isWalletConnected(): boolean {
  return walletClient !== null && currentAccount !== null;
}

/**
 * Get native token sentinel (used for BNB)
 */
export { NATIVE_TOKEN_SENTINEL };

/**
 * Get Flap Portal address for BNB chain
 */
export function getFlapPortalAddress(): string {
  return FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];
}
