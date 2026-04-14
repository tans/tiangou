export const FLAP_PORTAL_ABI = [
  {
    type: 'function',
    name: 'quoteExactInput',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'inputToken', type: 'address' },
          { name: 'outputToken', type: 'address' },
          { name: 'inputAmount', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'outputAmount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'swapExactInput',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'inputToken', type: 'address' },
          { name: 'outputToken', type: 'address' },
          { name: 'inputAmount', type: 'uint256' },
          { name: 'minOutputAmount', type: 'uint256' },
          { name: 'permitData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'outputAmount', type: 'uint256' }],
  },
] as const;
