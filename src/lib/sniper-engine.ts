import { parseEther } from 'viem';
import { useSniperStore } from '@/store/sniper';
import { FlapTokenFeedItem } from './flap/types';
import { startTokenFeedPolling, stopTokenFeedPolling, fetchTokenFeed } from './flap/indexer';
import { quoteExactInput, buyToken, sellToken } from './flap/trading';
import { createPosition, updatePosition, savePositions, loadPositions } from './flap/positions';
import { isWalletConnected } from './flap/client';

class SniperEngine {
  private quotePollingIntervals: Map<string, number> = new Map();
  private isMonitoring = false;

  /**
   * Start monitoring for new tokens
   */
  async startMonitoring() {
    if (this.isMonitoring) return;

    if (!isWalletConnected()) {
      useSniperStore.getState().setError('请先导入私钥');
      return;
    }

    this.isMonitoring = true;
    useSniperStore.getState().setStatus('monitoring');

    // Load saved positions from localStorage
    const savedPositions = loadPositions();
    if (savedPositions.length > 0) {
      useSniperStore.getState().setPositions(savedPositions);
      // Resume quote polling for open positions
      savedPositions.forEach(pos => {
        if (pos.status === 'open') {
          this.startQuotePolling(pos.tokenAddress);
        }
      });
    }

    // Start token feed polling
    startTokenFeedPolling((tokens) => {
      this.handleNewTokens(tokens);
    }, 10000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    useSniperStore.getState().setStatus('idle');

    // Stop all quote polling
    this.quotePollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.quotePollingIntervals.clear();

    // Stop token feed polling
    stopTokenFeedPolling();
  }

  /**
   * Handle new tokens from feed
   */
  private async handleNewTokens(tokens: FlapTokenFeedItem[]) {
    const store = useSniperStore.getState();
    const { filters, config } = store;

    // Update detected tokens
    tokens.forEach(token => {
      store.addToken(token);
    });

    // Auto snipe if enabled
    if (config.autoSnipe && filters.enabled) {
      for (const token of tokens) {
        if (this.evaluateFilters(token)) {
          await this.executeBuy(token);
          break; // Only buy one at a time
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

    // Create pending transaction
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

    // Execute buy
    const result = await buyToken(token.address, bnbAmount, config.slippage);

    if (result.success && result.txHash) {
      // Get actual token amount from quote
      const quote = await quoteExactInput(token.address, '0x0000000000000000000000000000000000000000', bnbAmount);

      // Update transaction
      store.updateTransaction(result.txHash, {
        status: 'success',
        tokenAmount: quote,
        price: bnbAmount / quote,
      });

      // Create position
      const position = createPosition(
        token,
        bnbAmount / quote, // entry price
        bnbAmount,
        quote,
        config.stopLossPercent,
        [config.takeProfitStep1, config.takeProfitStep2]
      );

      store.addPosition(position);
      savePositions([...store.positions]);

      // Start quote polling for this position
      this.startQuotePolling(token.address);
    } else {
      store.updateTransaction(result.txHash || '', {
        status: 'failed',
        error: result.error,
      });
    }

    store.setStatus('monitoring');
  }

  /**
   * Start polling quote for a position
   */
  private startQuotePolling(tokenAddress: string) {
    if (this.quotePollingIntervals.has(tokenAddress)) return;

    const interval = window.setInterval(async () => {
      await this.checkPosition(tokenAddress);
    }, 5000);

    this.quotePollingIntervals.set(tokenAddress, interval);
  }

  /**
   * Stop polling quote for a position
   */
  private stopQuotePolling(tokenAddress: string) {
    const interval = this.quotePollingIntervals.get(tokenAddress);
    if (interval) {
      clearInterval(interval);
      this.quotePollingIntervals.delete(tokenAddress);
    }
  }

  /**
   * Check position for take profit / stop loss
   */
  private async checkPosition(tokenAddress: string) {
    const store = useSniperStore.getState();
    const { positions, config } = store;

    const position = positions.find(p => p.tokenAddress === tokenAddress && p.status === 'open');
    if (!position) {
      this.stopQuotePolling(tokenAddress);
      return;
    }

    try {
      // Get current quote
      const currentQuote = await quoteExactInput(
        tokenAddress,
        '0x0000000000000000000000000000000000000000',
        position.remainingAmount
      );

      store.setCurrentQuote(tokenAddress, currentQuote);

      // Calculate current price vs entry price
      const currentPrice = currentQuote > 0n ? position.entryQuoteAmount * position.remainingAmount / currentQuote : 0n;
      const priceChange = position.entryPrice > 0n
        ? ((currentPrice - position.entryPrice) * 100n) / position.entryPrice
        : 0n;
      const profitPercent = Number(priceChange);

      // Check stop loss
      if (profitPercent <= -config.stopLossPercent) {
        await this.executeSell(position, 'stop_loss');
        return;
      }

      // Check take profit steps
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

  /**
   * Execute sell for a position
   */
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

    // Create pending transaction
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

    // Execute sell
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

      // Update position
      const newRemaining = position.remainingAmount - sellAmount;

      if (newRemaining <= 0n || triggeredBy === 'stop_loss') {
        // Close position
        store.updatePosition(position.id, {
          remainingAmount: 0n,
          status: 'closed',
        });
        this.stopQuotePolling(position.tokenAddress);
      } else {
        // Update remaining amount
        store.updatePosition(position.id, {
          remainingAmount: newRemaining,
        });

        // Mark take profit step as executed
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

// Singleton instance
export const sniperEngine = new SniperEngine();
