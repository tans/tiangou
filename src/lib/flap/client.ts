import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';

// Default RPC endpoints
const DEFAULT_RPC_URLS = [
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://rpc.ankr.com/bsc',
];

// BNB Chain configuration factory
function createBnbChain(rpcUrl?: string) {
  return {
    ...bsc,
    id: BNB_MAINNET_CHAIN_ID,
    rpcUrls: {
      default: { http: [rpcUrl || DEFAULT_RPC_URLS[0]] },
      public: { http: [rpcUrl || DEFAULT_RPC_URLS[0]] },
    },
  };
}

// Current RPC URL
let currentRpcUrl = DEFAULT_RPC_URLS[0];

// Public client for reading blockchain data
let publicClient = createPublicClient({
  chain: createBnbChain(),
  transport: http(),
});

// Wallet client type
export type FlapWalletClient = ReturnType<typeof createWalletClient>;

// Current wallet account
let currentAccount: ReturnType<typeof privateKeyToAccount> | null = null;
export let walletClient: FlapWalletClient | null = null;

/**
 * Set custom RPC URL
 */
export function setRpcUrl(rpcUrl: string): void {
  currentRpcUrl = rpcUrl;

  // Recreate public client with new RPC
  publicClient = createPublicClient({
    chain: createBnbChain(rpcUrl),
    transport: http(),
  });

  // Recreate wallet client if connected
  if (walletClient && currentAccount) {
    walletClient = createWalletClient({
      account: currentAccount,
      chain: createBnbChain(rpcUrl),
      transport: http(),
    });
  }
}

/**
 * Get current RPC URL
 */
export function getRpcUrl(): string {
  return currentRpcUrl;
}

/**
 * Get public client
 */
export function getPublicClient() {
  return publicClient;
}

/**
 * Initialize wallet client with private key
 */
export function initWalletClient(privateKey: string, rpcUrl?: string): void {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  currentAccount = privateKeyToAccount(key as `0x${string}`);

  const chain = createBnbChain(rpcUrl || currentRpcUrl);

  walletClient = createWalletClient({
    account: currentAccount,
    chain,
    transport: http(),
  });

  // Update public client to use the same RPC
  if (rpcUrl) {
    publicClient = createPublicClient({
      chain,
      transport: http(),
    });
  }
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

/**
 * Available RPC endpoints
 */
export const AVAILABLE_RPC_URLS = DEFAULT_RPC_URLS;
