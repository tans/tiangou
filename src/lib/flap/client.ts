import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';
import { toast } from '@/store/toast';

// Default RPC endpoints (in priority order)
const DEFAULT_RPC_URLS = [
  'https://bsc-rpc.publicnode.com',
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
let currentRpcIndex = 0;

// RPC connection state
export type RpcStatus = 'connected' | 'degraded' | 'disconnected';
let rpcStatus: RpcStatus = 'connected';
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

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
 * Get current RPC status
 */
export function getRpcStatus(): RpcStatus {
  return rpcStatus;
}

/**
 * Get current RPC URL
 */
export function getRpcUrl(): string {
  return currentRpcUrl;
}

/**
 * Internal: Set RPC status and show toast notification if changed
 */
function setRpcStatus(newStatus: RpcStatus, reason?: string) {
  const oldStatus = rpcStatus;
  rpcStatus = newStatus;

  if (newStatus !== oldStatus) {
    if (newStatus === 'disconnected') {
      toast.error('RPC连接失败', `正在切换到备用节点... ${reason || ''}`);
    } else if (newStatus === 'degraded') {
      toast.warning('RPC连接不稳定', reason || '网络延迟较高');
    } else if (newStatus === 'connected' && oldStatus !== 'connected') {
      toast.success('RPC已恢复', `当前节点: ${currentRpcUrl}`);
    }
  }
}

/**
 * Internal: Attempt to switch to next available RPC endpoint
 */
async function switchToNextRpc(): Promise<boolean> {
  const nextIndex = (currentRpcIndex + 1) % DEFAULT_RPC_URLS.length;
  const nextRpc = DEFAULT_RPC_URLS[nextIndex];

  console.log(`[RPC] Attempting switch from ${currentRpcUrl} to ${nextRpc}`);

  // Test the new RPC with a simple call
  const testClient = createPublicClient({
    chain: createBnbChain(nextRpc),
    transport: http(),
  });

  try {
    // Quick timeout test - wait max 3 seconds
    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), 3000)
    );
    const chainIdPromise = testClient.getChainId();

    const result = await Promise.race([chainIdPromise, timeoutPromise]);

    if (result === 'timeout') {
      console.log(`[RPC] Timeout testing ${nextRpc}, trying next...`);
      return false;
    }

    // Success - switch to this RPC
    currentRpcIndex = nextIndex;
    currentRpcUrl = nextRpc;

    // Recreate public client
    publicClient = createPublicClient({
      chain: createBnbChain(nextRpc),
      transport: http(),
    });

    // Recreate wallet client if connected
    if (walletClient && currentAccount) {
      walletClient = createWalletClient({
        account: currentAccount,
        chain: createBnbChain(nextRpc),
        transport: http(),
      });
    }

    setRpcStatus('connected');
    toast.info('已切换RPC节点', nextRpc);
    return true;
  } catch (error) {
    console.log(`[RPC] Failed to test ${nextRpc}:`, error);
    return false;
  }
}

/**
 * Internal: Called by RPC operations to report success/failure
 */
export function reportRpcResult(success: boolean) {
  if (success) {
    consecutiveFailures = 0;
    if (rpcStatus === 'degraded') {
      setRpcStatus('connected');
    }
  } else {
    consecutiveFailures++;
    console.log(`[RPC] Consecutive failures: ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      setRpcStatus('disconnected', `连续${consecutiveFailures}次失败`);

      // Attempt automatic failover
      void attemptAutomaticFailover();
    } else if (consecutiveFailures >= 2) {
      setRpcStatus('degraded', `连续${consecutiveFailures}次警告`);
    }
  }
}

/**
 * Attempt automatic failover to next RPC endpoint
 */
async function attemptAutomaticFailover(): Promise<void> {
  console.log('[RPC] Attempting automatic failover...');

  for (let i = 0; i < DEFAULT_RPC_URLS.length; i++) {
    const success = await switchToNextRpc();
    if (success) {
      console.log('[RPC] Failover successful');
      return;
    }
  }

  console.log('[RPC] All RPC endpoints failed');
  toast.error('RPC全部故障', '请检查网络连接或稍后重试');
  setRpcStatus('disconnected', '所有节点不可用');
}

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

  consecutiveFailures = 0;
  setRpcStatus('connected');
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

  // Reset failure counter on manual wallet init
  consecutiveFailures = 0;
  setRpcStatus('connected');
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
