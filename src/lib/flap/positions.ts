import type { Position, TakeProfitStep } from '../../store/sniper';
import type { FlapTokenFeedItem } from './types';

const POSITIONS_STORAGE_KEY = 'flap_positions';

/**
 * Create a new position after a successful buy
 */
export function createPosition(
  token: FlapTokenFeedItem,
  entryPrice: bigint,
  entryQuoteAmount: bigint,
  entryTokenAmount: bigint,
  stopLossPercent: number,
  takeProfitSteps: TakeProfitStep[]
): Position {
  const now = Date.now();

  return {
    id: `${token.address}-${now}`,
    tokenAddress: token.address,
    symbol: token.symbol,
    name: token.name,
    entryPrice,
    entryQuoteAmount,
    entryTokenAmount,
    remainingAmount: entryTokenAmount,
    stopLossPercent,
    takeProfitSteps,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update an existing position
 */
export function updatePosition(
  positions: Position[],
  positionId: string,
  updates: Partial<Position>
): Position[] {
  return positions.map(p => {
    if (p.id === positionId) {
      return { ...p, ...updates, updatedAt: Date.now() };
    }
    return p;
  });
}

/**
 * Mark a take profit step as executed
 */
export function markTakeProfitExecuted(
  positions: Position[],
  positionId: string,
  stepId: string
): Position[] {
  return positions.map(p => {
    if (p.id === positionId) {
      return {
        ...p,
        takeProfitSteps: p.takeProfitSteps.map(step =>
          step.id === stepId ? { ...step, executed: true } : step
        ),
        updatedAt: Date.now(),
      };
    }
    return p;
  });
}

/**
 * Save positions to localStorage
 */
export function savePositions(positions: Position[]): void {
  try {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('Failed to save positions:', error);
  }
}

/**
 * Load positions from localStorage
 */
export function loadPositions(): Position[] {
  try {
    const stored = localStorage.getItem(POSITIONS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load positions:', error);
  }
  return [];
}

/**
 * Clear all positions from localStorage
 */
export function clearPositions(): void {
  localStorage.removeItem(POSITIONS_STORAGE_KEY);
}

/**
 * Close a position
 */
export function closePosition(positions: Position[], positionId: string): Position[] {
  return positions.map(p => {
    if (p.id === positionId) {
      return { ...p, status: 'closed' as const, updatedAt: Date.now() };
    }
    return p;
  });
}
