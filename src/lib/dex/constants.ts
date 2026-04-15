import type { Address } from 'viem';

// PancakeSwap V2 Router
export const PANCAKE_ROUTER_V2: Record<number, Address> = {
  56: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // BNB Mainnet
  97: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // BNB Testnet
};

// Biswap Router
export const BISWAP_ROUTER: Record<number, Address> = {
  56: '0x3a6d8cA21D1CF76F653A675adFA62cB89Ac3EAz', // BNB Mainnet
  97: '0x787e94d4C5b5E84a0a4dE43aA4f6F22d3a8E3bF0', // BNB Testnet
};

// WBNB address (used for routing)
export const WBNB: Record<number, Address> = {
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BNB Mainnet
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // BNB Testnet
};

export const BNB_MAINNET_CHAIN_ID = 56;
export const BNB_TESTNET_CHAIN_ID = 97;
