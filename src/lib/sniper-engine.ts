import { parseEther } from 'viem';
import { useSniperStore } from '@/store/sniper';
import type { FlapTokenFeedItem } from './flap/types';
import { startTokenFeedPolling, stopTokenFeedPolling } from './flap/indexer';
import { quoteExactInput, buyToken, sellToken } from './flap/trading';
import { createPosition, updatePosition, savePositions, loadPositions } from './flap/positions';
import { isWalletConnected, getAccountAddress } from './flap/client';
import { getBnbBalance } from './flap/trading';
import { compareSellQuotes, sellTokenOnPancake, quotePancakeSwapOutput } from './dex';

// One hour in milliseconds
const ONE_HOUR = 60 * 60 * 1000;

class SniperEngine {
  private quotePollingIntervals: Map<string, number> = new Map();
  private isMonitoring = false;
  private autoStartCallback: (() => void) | null = null;

  /**
   * Set callback for when auto-start is triggered (wallet already connected)
   */
  onAutoStart(callback: () => void) {
    this.autoStartCallback = callback;
  }

  /**
   * Check if monitoring should auto-start (wallet connected on page load)
   */
  async checkAutoStart() {
    if (!isWalletConnected()) return;

    // Restore balance
    const address = getAccountAddress();
    if (address) {
      try {
        const balance = await getBnbBalance(address);
        useSniperStore.getState().setBnbBalance(balance);
      } catch (e) {
        console.error('Failed to fetch balance:', e);
      }
    }

    // Load saved positions
    const savedPositions = loadPositions();
    if (savedPositions.length > 0) {
      useSniperStore.getState().setPositions(savedPositions);
      savedPositions.forEach(pos => {
        if (pos.status === 'open') {
          this.startQuotePolling(pos.tokenAddress);
        }
      });
    }

    // Trigger auto-start monitoring
    if (this.autoStartCallback) {
      this.autoStartCallback();
    }

    // Auto-start monitoring
    await this.startMonitoring();
  }

  /**
   * Start monitoring without requiring wallet (for public token feed viewing)
   */
  async startMonitoringWithoutWallet() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    useSniperStore.getState().setStatus('monitoring');

    // Start token feed polling with historical data
    startTokenFeedPolling((tokens, isInitial) => {
      this.handleNewTokens(tokens, isInitial);
    }, 5000);
  }

  /**
   * Start monitoring for new tokens (requires wallet for trading)
   */
  async startMonitoring() {
    if (this.isMonitoring) return;

    if (!isWalletConnected()) {
      useSniperStore.getState().setError('请先导入私钥');
      return;
    }

    this.isMonitoring = true;
    useSniperStore.getState().setStatus('monitoring');

    // Load saved positions if not already loaded
    const currentPositions = useSniperStore.getState().positions;
    if (currentPositions.length === 0) {
      const savedPositions = loadPositions();
      if (savedPositions.length > 0) {
        useSniperStore.getState().setPositions(savedPositions);
        savedPositions.forEach(pos => {
          if (pos.status === 'open') {
            this.startQuotePolling(pos.tokenAddress);
          }
        });
      }
    }

    // Start token feed polling with historical data
    startTokenFeedPolling((tokens, isInitial) => {
      this.handleNewTokens(tokens, isInitial);
    }, 5000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    useSniperStore.getState().setStatus('idle');

    this.quotePollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.quotePollingIntervals.clear();

    stopTokenFeedPolling();
  }

  /**
   * Handle new tokens from feed
   */
  private async handleNewTokens(tokens: FlapTokenFeedItem[], isInitial: boolean) {
    const store = useSniperStore.getState();
    const { filters, config } = store;

    const now = Date.now();
    const oneHourAgo = now - ONE_HOUR;

    // Filter to only tokens detected in the last hour
    const recentTokens = tokens.filter(token => {
      // Keep tokens from the last hour
      if (token.detectedAt >= oneHourAgo) return true;
      // Also keep tokens that are already in our list (persistence)
      const existing = store.detectedTokens.find(t => t.address === token.address);
      return existing !== undefined;
    });

    // If initial load, set all historical tokens
    if (isInitial && recentTokens.length > 0) {
      store.setTokens(recentTokens);
    } else {
      // Add new tokens (not duplicates)
      recentTokens.forEach(token => {
        const exists = store.detectedTokens.some(t => t.address === token.address);
        if (!exists) {
          store.addToken(token);
        }
      });
    }

    // Auto snipe if enabled, not initial load, and wallet is connected
    if (!isInitial && config.autoSnipe && filters.enabled && isWalletConnected()) {
      for (const token of recentTokens) {
        if (this.evaluateFilters(token)) {
          await this.executeBuy(token);
          break;
        }
      }
    }
  }

  /**
   * Evaluate if a token passes filters
   */
  evaluateFilters(token: FlapTokenFeedItem): boolean {
    const { filters } = useSniperStore.getState();

    if (!filters.enabled) return true;
    if (filters.onlyTaxToken && !token.isTaxToken) return false;
    if (token.progress < filters.minProgress || token.progress > filters.maxProgress) return false;
    if (!filters.allowedVersions.includes(token.version)) return false;
    if (!token.tradable) return false;

    // Tax rate filter: > 5.25% tax = no buy (issue requirement)
    // Tax is stored in basis points (e.g., 525 = 5.25%)
    if (token.buyTax !== undefined) {
      const buyTaxPercent = Number(token.buyTax) / 100; // convert from basis points
      if (buyTaxPercent > filters.maxTaxRate) return false;
    }
    if (token.sellTax !== undefined) {
      const sellTaxPercent = Number(token.sellTax) / 100;
      if (sellTaxPercent > filters.maxTaxRate) return false;
    }

    // TG group filter
    if (filters.requireTgGroup && !token.hasTgGroup) return false;

    // Market cap filter
    if (token.marketCap !== undefined) {
      if (filters.minMarketCap !== undefined && token.marketCap < filters.minMarketCap) return false;
      if (filters.maxMarketCap !== undefined && token.marketCap > filters.maxMarketCap) return false;
    }

    return true;
  }

  /**
   * Execute buy for a token
   */
  private async executeBuy(token: FlapTokenFeedItem) {
    const store = useSniperStore.getState();
    const { config, address } = store;

    if (!address) {
      store.setError('请先导入私钥');
      return;
    }

    store.setStatus('sniping');

    const bnbAmount = parseEther(config.buyAmount.toString());

    const pendingTx = {
      hash: '',
      side: 'buy' as const,
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      quoteAmount: bnbAmount,
      tokenAmount: 0n,
      price: 0n,
      timestamp: Date.now(),
      status: 'pending' as const,
    };

    store.addTransaction(pendingTx);

    const result = await buyToken(token.address, bnbAmount, config.slippage);

    if (result.success && result.txHash) {
      const quote = await quoteExactInput(token.address, '0x0000000000000000000000000000000000000000', bnbAmount);

      store.updateTransaction(result.txHash, {
        status: 'success',
        tokenAmount: quote,
        price: bnbAmount / quote,
      });

      const position = createPosition(
        token,
        bnbAmount / quote,
        bnbAmount,
        quote,
        config.stopLossPercent,
        config.takeProfitSteps
      );

      store.addPosition(position);
      savePositions([...store.positions]);

      this.startQuotePolling(token.address);
    } else {
      store.updateTransaction(result.txHash || '', {
        status: 'failed',
        error: result.error,
      });
    }

    store.setStatus('monitoring');
  }

  private startQuotePolling(tokenAddress: string) {
    if (this.quotePollingIntervals.has(tokenAddress)) return;

    const interval = window.setInterval(async () => {
      await this.checkPosition(tokenAddress);
    }, 5000);

    this.quotePollingIntervals.set(tokenAddress, interval);
  }

  private stopQuotePolling(tokenAddress: string) {
    const interval = this.quotePollingIntervals.get(tokenAddress);
    if (interval) {
      clearInterval(interval);
      this.quotePollingIntervals.delete(tokenAddress);
    }
  }

  private async checkPosition(tokenAddress: string) {
    const store = useSniperStore.getState();
    const { positions, config } = store;

    const position = positions.find(p => p.tokenAddress === tokenAddress && p.status === 'open');
    if (!position) {
      this.stopQuotePolling(tokenAddress);
      return;
    }

    try {
      const currentQuote = await quoteExactInput(
        tokenAddress,
        '0x0000000000000000000000000000000000000000',
        position.remainingAmount
      );

      store.setCurrentQuote(tokenAddress, currentQuote);

      const currentPrice = currentQuote > 0n ? position.entryQuoteAmount * position.remainingAmount / currentQuote : 0n;
      const priceChange = position.entryPrice > 0n
        ? ((currentPrice - position.entryPrice) * 100n) / position.entryPrice
        : 0n;
      const profitPercent = Number(priceChange);

      if (profitPercent <= -config.stopLossPercent) {
        await this.executeSell(position, 'stop_loss');
        return;
      }

      for (const step of position.takeProfitSteps) {
        if (!step.executed && profitPercent >= step.profitPercent) {
          await this.executeSell(position, 'take_profit', step.sellPercent, step.id);
          return;
        }
      }
    } catch (error) {
      console.error(`Error checking position ${tokenAddress}:`, error);
    }
  }

  private async executeSell(
    position: ReturnType<typeof useSniperStore.getState>['positions'][0],
    triggeredBy: 'take_profit' | 'stop_loss',
    sellPercent?: number,
    stepId?: string
  ) {
    const store = useSniperStore.getState();
    const { config } = store;

    const sellAmount = sellPercent
      ? (position.remainingAmount * BigInt(sellPercent)) / 100n
      : position.remainingAmount;

    const pendingTx = {
      hash: '',
      side: 'sell' as const,
      tokenAddress: position.tokenAddress,
      symbol: position.symbol,
      name: position.name,
      quoteAmount: 0n,
      tokenAmount: sellAmount,
      price: 0n,
      timestamp: Date.now(),
      status: 'pending' as const,
      positionId: position.id,
      triggeredBy,
    };

    store.addTransaction(pendingTx);

    const result = await sellToken(position.tokenAddress, sellAmount, config.slippage);

    if (result.success && result.txHash) {
      const quote = await quoteExactInput(
        position.tokenAddress,
        '0x0000000000000000000000000000000000000000',
        sellAmount
      );

      store.updateTransaction(result.txHash, {
        status: 'success',
        quoteAmount: quote,
        price: sellAmount > 0n ? quote * position.entryTokenAmount / sellAmount : 0n,
      });

      const newRemaining = position.remainingAmount - sellAmount;

      if (newRemaining <= 0n || triggeredBy === 'stop_loss') {
        store.updatePosition(position.id, {
          remainingAmount: 0n,
          status: 'closed',
        });
        this.stopQuotePolling(position.tokenAddress);
      } else {
        store.updatePosition(position.id, {
          remainingAmount: newRemaining,
        });

        if (stepId) {
          const updatedPositions = store.positions.map(p => {
            if (p.id === position.id) {
              return {
                ...p,
                takeProfitSteps: p.takeProfitSteps.map(s =>
                  s.id === stepId ? { ...s, executed: true } : s
                ),
              };
            }
            return p;
          });
          store.setPositions(updatedPositions);
        }
      }

      savePositions(store.positions);
    } else {
      store.updateTransaction(result.txHash || '', {
        status: 'failed',
        error: result.error,
      });
    }
  }
}

export const sniperEngine = new SniperEngine();
