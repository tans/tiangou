import { readContract, writeContract, waitForTransactionReceipt } from 'viem/actions';
import { getPublicClient, walletClient, getAccountAddress } from './client';
import { PANCAKESWAP_ROUTER_ADDRESS, PANCKESWAP_LP_ABI, BNB_MAINNET_CHAIN_ID, NATIVE_TOKEN_SENTINEL } from './constants';
import type { Address } from 'viem';

// PancakeSwap Router ABI for swap
const PANCAKESWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactETHForTokens',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForETH',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

/**
 * Get pool reserves for a PancakeSwap LP token
 */
export async function getPoolReserves(poolAddress: Address): Promise<{ reserveBnb: bigint; reserveToken: bigint } | null> {
  try {
    const publicClient = getPublicClient();
    const token0 = await readContract(publicClient, {
      address: poolAddress,
      abi: PANCKESWAP_LP_ABI,
      functionName: 'token0',
    });

    const reserves = await readContract(publicClient, {
      address: poolAddress,
      abi: PANCKESWAP_LP_ABI,
      functionName: 'getReserves',
    });

    const [reserve0, reserve1] = reserves;

    // Determine which token is BNB (WBNB address: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c)
    const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address;

    if (token0.toLowerCase() === WBNB.toLowerCase()) {
      return { reserveBnb: reserve0, reserveToken: reserve1 };
    } else {
      return { reserveBnb: reserve1, reserveToken: reserve0 };
    }
  } catch (error) {
    console.error('[External DEX] Failed to get pool reserves:', error);
    return null;
  }
}

/**
 * Calculate market cap from pool reserves
 */
export function calculateMarketCap(reserveBnb: bigint, reserveToken: bigint, bnbPrice: number): number {
  const bnbAmount = Number(reserveBnb) / 1e18;
  const tokenAmount = Number(reserveToken) / 1e18;

  if (tokenAmount === 0) return 0;

  const pricePerToken = bnbAmount / tokenAmount;
  const totalSupply = tokenAmount; // approximation

  return pricePerToken * totalSupply * bnbPrice;
}

/**
 * Get quote for selling tokens on PancakeSwap
 */
export async function getExternalSwapQuote(
  tokenAddress: Address,
  tokenAmount: bigint
): Promise<bigint> {
  const publicClient = getPublicClient();
  const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address;

  const amounts = await readContract(publicClient, {
    address: PANCAKESWAP_ROUTER_ADDRESS,
    abi: PANCAKESWAP_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [tokenAmount, [tokenAddress, WBNB]],
  });

  return amounts[1];
}

/**
 * Sell tokens on PancakeSwap (external DEX)
 */
export async function sellOnPancakeSwap(
  tokenAddress: Address,
  tokenAmount: bigint,
  slippagePercent: number = 1
): Promise<{ success: boolean; outputAmount?: bigint; txHash?: string; error?: string }> {
  if (!walletClient) {
    return { success: false, error: '钱包未连接' };
  }

  const account = getAccountAddress();
  if (!account) {
    return { success: false, error: '无账户' };
  }

  try {
    // Get quote first
    const quoteResult = await getExternalSwapQuote(tokenAddress, tokenAmount);
    const minOutput = (quoteResult * BigInt(100 - slippagePercent)) / 100n;

    const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as Address;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 min deadline

    // First need to approve the router to spend our tokens
    const approveHash = await walletClient.writeContract({
      account,
      address: tokenAddress,
      abi: [
        {
          type: 'function',
          name: 'approve',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ] as const,
      functionName: 'approve',
      args: [PANCAKESWAP_ROUTER_ADDRESS, tokenAmount],
    });

    await getPublicClient().waitForTransactionReceipt({ hash: approveHash });

    // Execute swap
    const hash = await walletClient.writeContract({
      account,
      address: PANCAKESWAP_ROUTER_ADDRESS,
      abi: PANCAKESWAP_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [tokenAmount, minOutput, [tokenAddress, WBNB], account, deadline],
    });

    const receipt = await getPublicClient().waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      return { success: true, txHash: hash, outputAmount: quoteResult };
    } else {
      return { success: false, error: '交易失败' };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}