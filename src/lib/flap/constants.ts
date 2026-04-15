import type { Address } from 'viem';

export const BNB_MAINNET_CHAIN_ID = 56;
export const BNB_TESTNET_CHAIN_ID = 97;

export const NATIVE_TOKEN_SENTINEL =
  '0x0000000000000000000000000000000000000000' as Address;

export const FLAP_PORTAL_ADDRESSES: Record<number, Address> = {
  [BNB_MAINNET_CHAIN_ID]: '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0',
  [BNB_TESTNET_CHAIN_ID]: '0x5bEacaF7ABCbB3aB280e80D007FD31fcE26510e9',
};

// PancakeSwap Router v2
export const PANCAKESWAP_ROUTER_ADDRESS: Address = '0x10ED43C718714eb63d5aA57B78b54704E256024E';

// PancakeSwap LP Token ABI (for getting reserves)
export const PANCKESWAP_LP_ABI = [
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'token1',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;
