export const FLAP_PORTAL_EVENTS = [
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { type: 'uint256', name: 'ts', indexed: false },
      { type: 'address', name: 'creator', indexed: true },
      { type: 'uint256', name: 'nonce', indexed: false },
      { type: 'address', name: 'token', indexed: true },
      { type: 'string', name: 'name', indexed: false },
      { type: 'string', name: 'symbol', indexed: false },
      { type: 'string', name: 'meta', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenQuoteSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'quoteToken', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenCurveSetV2',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'uint256', name: 'r', indexed: false },
      { type: 'uint256', name: 'h', indexed: false },
      { type: 'uint256', name: 'k', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenDexSupplyThreshSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'uint256', name: 'dexSupplyThresh', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FlapTokenTaxSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'uint256', name: 'tax', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FlapTokenAsymmetricTaxSet',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'uint256', name: 'buyTax', indexed: false },
      { type: 'uint256', name: 'sellTax', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenBought',
    inputs: [
      { type: 'uint256', name: 'ts', indexed: false },
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'buyer', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'eth', indexed: false },
      { type: 'uint256', name: 'fee', indexed: false },
      { type: 'uint256', name: 'postPrice', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenSold',
    inputs: [
      { type: 'uint256', name: 'ts', indexed: false },
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'seller', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'eth', indexed: false },
      { type: 'uint256', name: 'fee', indexed: false },
      { type: 'uint256', name: 'postPrice', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LaunchedToDEX',
    inputs: [
      { type: 'address', name: 'token', indexed: true },
      { type: 'address', name: 'pool', indexed: false },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'eth', indexed: false },
    ],
  },
] as const;

export const FLAP_PORTAL_ABI = [
  {
    type: 'function',
    name: 'quoteExactInput',
    stateMutability: 'view',
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
