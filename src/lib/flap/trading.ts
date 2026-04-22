import { readContract } from 'viem/actions';
import { FLAP_PORTAL_ABI } from './abi';
import { FLAP_PORTAL_ADDRESSES, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';
import { getPublicClient, walletClient, getAccountAddress, reportRpcResult } from './client';
import type { Address } from 'viem';

const FLAP_PORTAL_ADDRESS = FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID];

/**
 * Get quote for a swap
 */
export async function quoteExactInput(
  inputToken: string,
  outputToken: string,
  inputAmount: bigint
): Promise<bigint> {
  try {
    const result = await readContract(getPublicClient(), {
      address: FLAP_PORTAL_ADDRESS as `0x${string}`,
      abi: FLAP_PORTAL_ABI,
      functionName: 'quoteExactInput',
      args: [{
        inputToken: inputToken as `0x${string}`,
        outputToken: outputToken as `0x${string}`,
        inputAmount,
      }],
    });
    reportRpcResult(true);
    return result as bigint;
  } catch (error) {
    reportRpcResult(false);
    throw error;
  }
}

/**
 * Execute a swap
 */
export async function swapExactInput(
  inputToken: string,
  outputToken: string,
  inputAmount: bigint,
  minOutputAmount: bigint,
  permitData: string = '0x'
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  if (!walletClient) {
    return { success: false, error: '钱包未连接' };
  }

  const account = getAccountAddress() as Address | null;
  if (!account) {
    return { success: false, error: '无账户' };
  }

  try {
    const hash = await (walletClient.writeContract as any)({
      address: FLAP_PORTAL_ADDRESS as `0x${string}`,
      abi: FLAP_PORTAL_ABI,
      functionName: 'swapExactInput',
      args: [{
        inputToken: inputToken as `0x${string}`,
        outputToken: outputToken as `0x${string}`,
        inputAmount,
        minOutputAmount,
        permitData: permitData as `0x${string}`,
      }],
      value: inputToken === NATIVE_TOKEN_SENTINEL ? inputAmount : 0n,
    });

    // Wait for transaction receipt
    const receipt = await getPublicClient().waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      return { success: true, txHash: hash };
    } else {
      return { success: false, error: '交易失败' };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Buy a token with BNB
 */
export async function buyToken(
  tokenAddress: string,
  bnbAmount: bigint,
  slippagePercent: number = 1
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  // First get quote
  const quoteResult = await quoteExactInput(NATIVE_TOKEN_SENTINEL, tokenAddress, bnbAmount);

  // Calculate min output with slippage
  const slippageMultiplier = BigInt(100 - slippagePercent);
  const minOutput = (quoteResult * slippageMultiplier) / 100n;

  // Execute swap
  return swapExactInput(NATIVE_TOKEN_SENTINEL, tokenAddress, bnbAmount, minOutput);
}

/**
 * Sell a token for BNB
 */
export async function sellToken(
  tokenAddress: string,
  tokenAmount: bigint,
  slippagePercent: number = 1
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  // First get quote
  const quoteResult = await quoteExactInput(tokenAddress, NATIVE_TOKEN_SENTINEL, tokenAmount);

  // Calculate min output with slippage
  const slippageMultiplier = BigInt(100 - slippagePercent);
  const minOutput = (quoteResult * slippageMultiplier) / 100n;

  // Execute swap
  return swapExactInput(tokenAddress, NATIVE_TOKEN_SENTINEL, tokenAmount, minOutput);
}

/**
 * Get BNB balance for an address
 */
export async function getBnbBalance(address: string): Promise<bigint> {
  try {
    const balance = await getPublicClient().getBalance({ address: address as `0x${string}` });
    reportRpcResult(true);
    return balance;
  } catch (error) {
    reportRpcResult(false);
    throw error;
  }
}
