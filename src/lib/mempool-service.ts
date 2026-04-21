/**
 * Real Token Detection Service
 * Uses The Graph and WebSocket for real-time token monitoring
 */

import type { Address } from 'viem';

// The Graph endpoints for Uniswap V2
const THEGRAPH_UNISWAP_V2_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';

// Known factory events for new pair creation
const FACTORY_ADDRESSES: Record<string, Address> = {
  uniswap_v2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  sushiswap: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
  pancakeswap: '0x1097053Fd2ea711dad45caCcc1Ef6F69A1d4aF10',
};

export interface NewPairEvent {
  id: string;
  pair: Address;
  token0: Address;
  token1: Address;
  timestamp: number;
  transactionHash: string;
}

export interface MempoolProvider {
  name: string;
  websocketUrl?: string;
  restUrl?: string;
  apiKey?: string;
}

export const SUPPORTED_MEMPOOL_PROVIDERS: Record<string, MempoolProvider> = {
  // Public Ethereum nodes (limited)
  alchemy: {
    name: 'Alchemy',
    websocketUrl: 'wss://eth-mainnet.g.alchemy.com/v2/demo',
    restUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
  },
  infura: {
    name: 'Infura',
    websocketUrl: 'wss://mainnet.infura.io/ws/v3/demo',
    restUrl: 'https://mainnet.infura.io/v3/demo',
  },
  // RPC endpoints
  blast: {
    name: 'Blast',
    restUrl: 'https://rpc.blast.io',
  },
 ankr: {
    name: 'Ankr',
    restUrl: 'https://rpc.ankr.com/eth',
  },
  public: {
    name: 'Public RPC',
    restUrl: 'https://eth.llamarpc.com',
  },
};

class MempoolService {
  private ws: WebSocket | null = null;
  private provider: MempoolProvider | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Set<(event: NewPairEvent) => void> = new Set();

  /**
   * Connect to a mempool provider
   */
  async connect(provider: MempoolProvider): Promise<boolean> {
    if (this.isConnected) {
      await this.disconnect();
    }

    this.provider = provider;
    
    if (provider.websocketUrl) {
      return this.connectWebSocket();
    }
    
    // Fallback to polling if no WebSocket
    return this.startPolling();
  }

  /**
   * Connect via WebSocket for real-time updates
   */
  private async connectWebSocket(): Promise<boolean> {
    if (!this.provider?.websocketUrl) return false;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.provider!.websocketUrl!);

        this.ws.onopen = () => {
          console.log('[Mempool] Connected via WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.subscribeToNewPairs();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[Mempool] WebSocket error:', error);
        };

        this.ws.onclose = () => {
          console.log('[Mempool] WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[Mempool] Failed to connect:', error);
        resolve(false);
      }
    });
  }

  /**
   * Start polling for new pairs (fallback)
   */
  private async startPolling(): Promise<boolean> {
    console.log('[Mempool] Starting polling mode');
    this.isConnected = true;
    // Poll The Graph for new pairs every 10 seconds
    this.pollTheGraph();
    return true;
  }

  /**
   * Poll The Graph for new pair creations
   */
  private pollInterval: number | null = null;

  private async pollTheGraph(): Promise<void> {
    if (this.pollInterval) return;

    this.pollInterval = window.setInterval(async () => {
      try {
        const newPairs = await this.queryNewPairs();
        newPairs.forEach(pair => {
          this.emitNewPair(pair);
        });
      } catch (error) {
        console.error('[Mempool] Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds
  }

  /**
   * Query The Graph for new pairs created in the last few minutes
   */
  private async queryNewPairs(): Promise<NewPairEvent[]> {
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = now - 300;

    const query = `
      query {
        pairs(
          first: 20,
          orderBy: createdAtTimestamp,
          orderDirection: desc,
          where: {
            createdAtTimestamp_gte: ${fiveMinutesAgo}
          }
        ) {
          id
          token0 {
            id
            symbol
            name
          }
          token1 {
            id
            symbol
            name
          }
          createdAtTimestamp
          transactionHash
        }
      }
    `;

    try {
      const response = await fetch(THEGRAPH_UNISWAP_V2_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('[TheGraph] Query errors:', data.errors);
        return [];
      }

      return (data.data?.pairs || []).map((pair: any) => ({
        id: pair.id,
        pair: pair.id as Address,
        token0: pair.token0.id as Address,
        token1: pair.token1.id as Address,
        timestamp: parseInt(pair.createdAtTimestamp) * 1000,
        transactionHash: pair.transactionHash,
      }));
    } catch (error) {
      console.error('[TheGraph] Failed to query:', error);
      return [];
    }
  }

  /**
   * Subscribe to new pair creation events via WebSocket
   */
  private subscribeToNewPairs(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to logs for PairCreated events
    const subscription = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['logs', {
        address: Object.values(FACTORY_ADDRESSES),
        topics: [
          '0x0d3648bd0f6ba80134a33ba9275ac5854989b47297f9796e0a7e2c4c19749f02', // PairCreated event signature
        ],
      }],
    };

    this.ws.send(JSON.stringify(subscription));
    console.log('[Mempool] Subscribed to PairCreated events');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (message.params?.result) {
        // New log event
        const log = message.params.result;
        this.processNewPairLog(log);
      }
    } catch (error) {
      // Ignore non-JSON messages (pings, etc.)
    }
  }

  /**
   * Process a new pair creation log
   */
  private processNewPairLog(log: any): void {
    // Parse the log data to extract token addresses
    // The PairCreated event has:
    // 0: token0 address (offset 0, 32 bytes)
    // 1: token1 address (offset 32, 32 bytes)
    // 2: pair address (offset 64, 32 bytes)
    
    try {
      const data = log.data;
      const token0 = `0x${data.slice(26, 66)}` as Address;
      const token1 = `0x${data.slice(90, 130)}` as Address;
      const pair = `0x${data.slice(154, 194)}` as Address;

      const event: NewPairEvent = {
        id: log.transactionHash,
        pair,
        token0,
        token1,
        timestamp: Date.now(),
        transactionHash: log.transactionHash,
      };

      // Only emit if one of the tokens is WETH (new ETH pair)
      const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      if (token0.toLowerCase() === WETH.toLowerCase() || token1.toLowerCase() === WETH.toLowerCase()) {
        this.emitNewPair(event);
      }
    } catch (error) {
      console.error('[Mempool] Failed to parse log:', error);
    }
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Mempool] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[Mempool] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.provider) {
        this.connect(this.provider);
      }
    }, delay);
  }

  /**
   * Disconnect from the mempool provider
   */
  async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.provider = null;
    console.log('[Mempool] Disconnected');
  }

  /**
   * Add a listener for new pair events
   */
  addListener(callback: (event: NewPairEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit a new pair event to all listeners
   */
  private emitNewPair(event: NewPairEvent): void {
    console.log('[Mempool] New pair detected:', event.pair);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[Mempool] Listener error:', error);
      }
    });
  }

  /**
   * Check connection status
   */
  getStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const mempoolService = new MempoolService();
