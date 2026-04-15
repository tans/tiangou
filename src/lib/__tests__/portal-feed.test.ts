import { describe, expect, test } from 'vitest';

import {
  buildPortalEventSummary,
  mergeLatestCreatedTokens,
} from '../flap/portal-feed';

describe('Portal feed helpers', () => {
  test('formats compact summaries with exclamation marks for supported Portal events', () => {
    expect(
      buildPortalEventSummary({
        type: 'TokenCreated',
        symbol: 'PEPE',
        token: '0x1111111111111111111111111111111111111111',
        details: {
          creator: '0x2222222222222222222222222222222222222222',
        },
      }).summary,
    ).toContain('❗');

    expect(
      buildPortalEventSummary({
        type: 'TokenBought',
        symbol: 'PEPE',
        token: '0x1111111111111111111111111111111111111111',
        details: {
          amount: 120000n,
          eth: 320000000000000000n,
        },
      }).summary,
    ).toContain('❗');
  });

  test('keeps only the latest 20 unique created tokens', () => {
    const tokens = Array.from({ length: 25 }, (_, index) => ({
      address: `0x${String(index + 1).padStart(40, '0')}` as `0x${string}`,
      symbol: `T${index + 1}`,
      name: `Token ${index + 1}`,
      detectedAt: index + 1,
    }));

    const merged = mergeLatestCreatedTokens([], tokens);

    expect(merged).toHaveLength(20);
    expect(merged[0]?.symbol).toBe('T25');
    expect(merged.at(-1)?.symbol).toBe('T6');
  });
});
