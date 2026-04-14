import { create } from 'zustand';
import { type Address } from 'viem';
import { FlapTokenFeedItem } from '../lib/flap/types';

// Take Profit Step
export interface TakeProfitStep {
  id: string;
  profitPercent: number; // e.g., 50 = 50% profit
  sellPercent: number;   // e.g., 30 = sell 30% of position
  executed: boolean;
}

// Position
export interface Position {
  id: string;
  tokenAddress: Address;
  symbol: string;
  name: string;
  entryPrice: bigint;       // quote/token ratio
  entryQuoteAmount: bigint;  // BNB amount spent
  entryTokenAmount: bigint;  // tokens bought
  remainingAmount: bigint;   // tokens remaining
  stopLossPercent: number;   // e.g., 20 = 20% loss triggers stop loss
  takeProfitSteps: TakeProfitStep[];
  status: 'open' | 'closed';
  createdAt: number;
  updatedAt: number;
}

// Transaction with buy/sell support
export interface Transaction {
  hash: string;
  side: 'buy' | 'sell';
  tokenAddress: Address;
  symbol: string;
  name: string;
  quoteAmount: bigint;      // BNB amount
  tokenAmount: bigint;      // token amount
  price: bigint;            // execution price (quote/token)
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: bigint;
  error?: string;
  positionId?: string;
  triggeredBy?: 'manual' | 'take_profit' | 'stop_loss';
}

// Filter Config for Flap
export interface FilterConfig {
  enabled: boolean;
  onlyTaxToken: boolean;       // only show tax tokens
  minProgress: number;          // 0-100
  maxProgress: number;         // 0-100
  allowedVersions: string[];    // ['v1', 'v2', 'v3', 'v4', 'v5']
  quoteToken: Address | null;   // null = any, or specific token
  maxObservedTaxRate?: number; // max tax percentage observed
}

// Sniper Config
export interface SniperConfig {
  buyAmount: number;           // in BNB
  slippage: number;             // percentage
  stopLossPercent: number;     // e.g., 20 = 20% loss
  takeProfitStep1: TakeProfitStep;
  takeProfitStep2: TakeProfitStep;
  autoSnipe: boolean;
}

export type MonitorStatus = 'idle' | 'connecting' | 'monitoring' | 'sniping' | 'error';

interface SniperState {
  // Wallet
  address: Address | null;
  bnbBalance: bigint;
  isConnected: boolean;

  // Monitor
  status: MonitorStatus;
  detectedTokens: FlapTokenFeedItem[];
  recentToken: FlapTokenFeedItem | null;

  // Positions
  positions: Position[];

  // Transactions
  transactions: Transaction[];

  // Config
  filters: FilterConfig;
  config: SniperConfig;

  // Current quotes for positions
  currentQuotes: Map<Address, bigint>;

  // Error message
  errorMessage: string | null;

  // Actions
  setAddress: (address: Address | null) => void;
  setBnbBalance: (balance: bigint) => void;
  setStatus: (status: MonitorStatus) => void;
  setError: (error: string | null) => void;
  addToken: (token: FlapTokenFeedItem) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  setFilters: (filters: Partial<FilterConfig>) => void;
  setConfig: (config: Partial<SniperConfig>) => void;
  addPosition: (position: Position) => void;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  setPositions: (positions: Position[]) => void;
  removePosition: (positionId: string) => void;
  setCurrentQuote: (tokenAddress: Address, quote: bigint) => void;
  clearTokens: () => void;
}

const DEFAULT_TP1: TakeProfitStep = {
  id: 'tp1',
  profitPercent: 50,
  sellPercent: 30,
  executed: false,
};

const DEFAULT_TP2: TakeProfitStep = {
  id: 'tp2',
  profitPercent: 100,
  sellPercent: 40,
  executed: false,
};

export const useSniperStore = create<SniperState>((set) => ({
  // Initial state
  address: null,
  bnbBalance: 0n,
  isConnected: false,

  status: 'idle',
  detectedTokens: [],
  recentToken: null,

  positions: [],

  transactions: [],

  filters: {
    enabled: true,
    onlyTaxToken: false,
    minProgress: 0,
    maxProgress: 100,
    allowedVersions: ['v1', 'v2', 'v3', 'v4', 'v5'],
    quoteToken: null,
    maxObservedTaxRate: 50,
  },

  config: {
    buyAmount: 0.01,
    slippage: 5,
    stopLossPercent: 20,
    takeProfitStep1: DEFAULT_TP1,
    takeProfitStep2: DEFAULT_TP2,
    autoSnipe: true,
  },

  currentQuotes: new Map(),

  errorMessage: null,

  // Actions
  setAddress: (address) => set({ address, isConnected: !!address }),

  setBnbBalance: (bnbBalance) => set({ bnbBalance }),

  setStatus: (status) => set({ status }),

  setError: (errorMessage) => set({ errorMessage }),

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

  addPosition: (position) => set((state) => ({
    positions: [...state.positions, position],
  })),

  updatePosition: (positionId, updates) => set((state) => ({
    positions: state.positions.map((p) =>
      p.id === positionId ? { ...p, ...updates, updatedAt: Date.now() } : p
    ),
  })),

  setPositions: (positions) => set({ positions }),

  removePosition: (positionId) => set((state) => ({
    positions: state.positions.filter((p) => p.id !== positionId),
  })),

  setCurrentQuote: (tokenAddress, quote) => set((state) => {
    const newQuotes = new Map(state.currentQuotes);
    newQuotes.set(tokenAddress, quote);
    return { currentQuotes: newQuotes };
  }),

  clearTokens: () => set({ detectedTokens: [], recentToken: null }),
}));
