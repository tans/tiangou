import { create } from 'zustand';
import { type Address, parseEther, formatEther } from 'viem';

// Types
export interface Token {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  detectedAt: number;
  hasTG: boolean;
  buyTax: number;
  sellTax: number;
  liquidity: bigint;
  isHoneypot: boolean;
  honeypotResult?: 'passed' | 'failed' | 'pending';
}

export interface Transaction {
  hash: string;
  token: Token;
  amountIn: bigint;
  amountOut: bigint;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: bigint;
  error?: string;
}

export interface FilterConfig {
  enabled: boolean;
  requireTG: boolean;
  maxBuyTax: number;
  maxSellTax: number;
  minLiquidity: number;
  checkHoneypot: boolean;
  minHoneypotScore: number;
}

export interface SniperConfig {
  buyAmount: number; // in ETH
  slippage: number; // in percentage
  gasPrice: bigint;
  mevProtection: boolean;
  autoSnipe: boolean;
}

export type MonitorStatus = 'idle' | 'connecting' | 'monitoring' | 'error';

// Store
interface SniperState {
  // Wallet
  address: Address | null;
  balance: bigint;
  chainId: number;
  isConnected: boolean;
  
  // Monitor
  status: MonitorStatus;
  detectedTokens: Token[];
  recentToken: Token | null;
  
  // Transactions
  transactions: Transaction[];
  
  // Config
  filters: FilterConfig;
  config: SniperConfig;
  
  // Gas
  gasPrice: bigint;
  
  // Actions
  setAddress: (address: Address | null) => void;
  setBalance: (balance: bigint) => void;
  setStatus: (status: MonitorStatus) => void;
  addToken: (token: Token) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  setFilters: (filters: Partial<FilterConfig>) => void;
  setConfig: (config: Partial<SniperConfig>) => void;
  setGasPrice: (gasPrice: bigint) => void;
  setRecentToken: (token: Token | null) => void;
  clearTokens: () => void;
}

export const useSniperStore = create<SniperState>((set) => ({
  // Initial state
  address: null,
  balance: 0n,
  chainId: 1,
  isConnected: false,
  
  status: 'idle',
  detectedTokens: [],
  recentToken: null,
  
  transactions: [],
  
  filters: {
    enabled: true,
    requireTG: false,
    maxBuyTax: 10,
    maxSellTax: 10,
    minLiquidity: 0.1,
    checkHoneypot: true,
    minHoneypotScore: 50,
  },
  
  config: {
    buyAmount: 0.01,
    slippage: 5,
    gasPrice: 0n,
    mevProtection: true,
    autoSnipe: true,
  },
  
  gasPrice: 0n,
  
  // Actions
  setAddress: (address) => set({ address, isConnected: !!address }),
  setBalance: (balance) => set({ balance }),
  setStatus: (status) => set({ status }),
  
  addToken: (token) => set((state) => ({
    detectedTokens: [token, ...state.detectedTokens].slice(0, 50),
    recentToken: token,
  })),
  
  addTransaction: (tx) => set((state) => ({
    transactions: [tx, ...state.transactions].slice(0, 100),
  })),
  
  updateTransaction: (hash, updates) => set((state) => ({
    transactions: state.transactions.map((tx) =>
      tx.hash === hash ? { ...tx, ...updates } : tx
    ),
  })),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  
  setConfig: (config) => set((state) => ({
    config: { ...state.config, ...config },
  })),
  
  setGasPrice: (gasPrice) => set({ gasPrice }),
  setRecentToken: (token) => set({ recentToken: token }),
  clearTokens: () => set({ detectedTokens: [], recentToken: null }),
}));
