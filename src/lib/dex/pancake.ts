import { readContract, writeContract, simulateContract } from 'viem/actions';
import { DEX_ROUTER_ABI, ERC20_ABI } from './abi';
import { PANCAKE_ROUTER_V2, WBNB, BNB_MAINNET_CHAIN_ID } from './constants';
import { getPublicClient, walletClient, getAccountAddress } from '../flap/client';
import type { Address } from 'viem';

const ROUTER_ADDRESS = PANCAKE_ROUTER_V2[BNB_MAINNET_CHAIN_ID];
const WBNB_ADDRESS = WBNB[BNB_MAINNET_CHAIN_ID];

/**
 * Get quote for selling tokens on PancakeSwap
 * @param tokenAddress The token to sell
 * @param tokenAmount Amount of tokens to sell
 * @returns Expected BNB output amount
 */
export async function quotePancakeSwapOutput(
  tokenAddress: string,
  tokenAmount: bigint
): Promise<bigint> {
  const amounts = await readContract(getPublicClient(), {
    address: ROUTER_ADDRESS as `0x${string}`,
    abi: DEX_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [tokenAmount, [tokenAddress as `0x${string}`, WBNB_ADDRESS as `0x${string}`]],
  });

  return amounts[1];
}

/**
 * Get quote for buying tokens on PancakeSwap
 * @param tokenAddress The token to buy
 * @param bnbAmount Amount of BNB to spend
 * @returns Expected token output amount
 */
export async function quotePancakeSwapInput(
  tokenAddress: string,
  bnbAmount: bigint
): Promise<bigint> {
  const amounts = await readContract(getPublicClient(), {
    address: ROUTER_ADDRESS as `0x${string}`,
    abi: DEX_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [bnbAmount, [WBNB_ADDRESS as `0x${string}`, tokenAddress as `0x${string}`]],
  });

  return amounts[1];
}

/**
 * Sell tokens on PancakeSwap for BNB
 */
export async function sellTokenOnPancake(
  tokenAddress: string,
  tokenAmount: bigint,
  minOutputAmount: bigint,
  slippagePercent: number = 1
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  if (!walletClient) {
    return { success: false, error: '钱包未连接' };
  }

  const account = getAccountAddress() as Address | null;
  if (!account) {
    return { success: false, error: '无账户' };
  }

  try {
    // Check and set allowance if needed
    const allowance = await readContract(getPublicClient(), {
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account as `0x${string}`, ROUTER_ADDRESS as `0x${string}`],
    });

    if (allowance < tokenAmount) {
      // Approve router to spend tokens
      const approveHash = await (walletClient.writeContract as any)({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ROUTER_ADDRESS as `0x${string}`, tokenAmount],
      });

      await getPublicClient().waitForTransactionReceipt({ hash: approveHash });
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10); // 10 minutes

    const hash = await (walletClient.writeContract as any)({
      address: ROUTER_ADDRESS as `0x${string}`,
      abi: DEX_ROUTER_ABI,
      functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
      args: [tokenAmount, minOutputAmount, [tokenAddress as `0x${string}`, WBNB_ADDRESS as `0x${string}`], account as `0x${string}`, deadline],
    });

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
 * Buy tokens on PancakeSwap with BNB
 */
export async function buyTokenOnPancake(
  tokenAddress: string,
  bnbAmount: bigint,
  minOutputAmount: bigint,
  slippagePercent: number = 1
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  if (!walletClient) {
    return { success: false, error: '钱包未连接' };
  }

  const account = getAccountAddress() as Address | null;
  if (!account) {
    return { success: false, error: '无账户' };
  }

  try {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 10); // 10 minutes

    const hash = await (walletClient.writeContract as any)({
      address: ROUTER_ADDRESS as `0x${string}`,
      abi: DEX_ROUTER_ABI,
      functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
      args: [minOutputAmount, [WBNB_ADDRESS as `0x${string}`, tokenAddress as `0x${string}`], account as `0x${string}`, deadline],
      value: bnbAmount,
    });

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
