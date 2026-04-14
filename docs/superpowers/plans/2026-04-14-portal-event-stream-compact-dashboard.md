# Portal Event Stream Compact Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current token monitor with a compact dashboard that shows the full Portal event stream and live quotes for the latest 20 created tokens.

**Architecture:** Keep the existing wallet and trading flow intact, add a Portal-focused event/quote monitoring layer, and reshape the dashboard around a compact top control bar plus a two-column event and price view. Extend the existing Zustand store instead of replacing it.

**Tech Stack:** Astro, React, Zustand, Vitest, viem

---

### Task 1: Lock Core Monitoring Rules With Tests

**Files:**
- Create: `src/lib/__tests__/portal-feed.test.ts`
- Create: `src/lib/flap/portal-feed.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, test } from 'vitest';
import {
  buildPortalEventSummary,
  mergeLatestCreatedTokens,
} from '../flap/portal-feed';

describe('Portal feed helpers', () => {
  test('formats compact summaries for supported Portal events', () => {
    expect(
      buildPortalEventSummary({
        type: 'TokenCreated',
        symbol: 'PEPE',
        token: '0x1111111111111111111111111111111111111111',
        details: {
          creator: '0x2222222222222222222222222222222222222222',
        },
      }),
    ).toContain('NEW');

    expect(
      buildPortalEventSummary({
        type: 'TokenBought',
        symbol: 'PEPE',
        token: '0x1111111111111111111111111111111111111111',
        details: {
          amount: 120000n,
          eth: 320000000000000000n,
        },
      }),
    ).toContain('BUY');
  });

  test('keeps only the latest 20 unique created tokens', () => {
    const tokens = Array.from({ length: 25 }, (_, index) => ({
      address: `0x${String(index + 1).padStart(40, '0')}`,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/portal-feed.test.ts`
Expected: FAIL because `src/lib/flap/portal-feed.ts` and its exports do not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement:
- Portal event summary formatter
- Latest-20 unique token merge helper

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/portal-feed.test.ts`
Expected: PASS

### Task 2: Add Portal Event and Live Quote State

**Files:**
- Modify: `src/store/sniper.ts`
- Modify: `src/lib/flap/types.ts`
- Modify: `src/lib/flap/abi.ts`
- Modify: `src/lib/flap/trading.ts`
- Modify: `src/lib/flap/portal-feed.ts`

- [ ] **Step 1: Extend types for Portal events and live quotes**
- [ ] **Step 2: Add store state and actions for event stream, latest-20 tokens, and live quotes**
- [ ] **Step 3: Expand ABI coverage to all required Portal events**
- [ ] **Step 4: Add quote refresh support for latest-20 created tokens**
- [ ] **Step 5: Run targeted tests**

Run: `npm test -- src/lib/__tests__/portal-feed.test.ts`
Expected: PASS

### Task 3: Replace the Monitoring Layer

**Files:**
- Modify: `src/lib/flap/indexer.ts`
- Modify: `src/lib/sniper-engine.ts`

- [ ] **Step 1: Replace narrow token feed polling with full Portal event polling**
- [ ] **Step 2: Normalize all event types into the event stream**
- [ ] **Step 3: Track latest-20 created tokens and trigger quote refresh**
- [ ] **Step 4: Preserve existing auto-snipe token detection behavior off `TokenCreated`**
- [ ] **Step 5: Run targeted tests**

Run: `npm test -- src/lib/__tests__/portal-feed.test.ts`
Expected: PASS

### Task 4: Rebuild the Dashboard Into a Compact Console

**Files:**
- Create: `src/components/CompactSniperBar.tsx`
- Create: `src/components/PortalEventStream.tsx`
- Create: `src/components/LivePricePanel.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/SniperConfigPanel.tsx`
- Modify: `src/components/TokenMonitor.tsx`

- [ ] **Step 1: Create a compact top sniper control bar**
- [ ] **Step 2: Create a compact Portal event stream component**
- [ ] **Step 3: Create a compact live price panel component**
- [ ] **Step 4: Replace the dashboard layout with top bar plus two columns**
- [ ] **Step 5: Remove or bypass obsolete roomy monitor sections**

### Task 5: Verification

**Files:**
- Modify: `src/lib/__tests__/portal-feed.test.ts` if needed

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- src/lib/__tests__/portal-feed.test.ts`
Expected: PASS

- [ ] **Step 2: Run a build or type-oriented verification command that is useful in this repo**

Run: `npm test -- src/lib/__tests__/flap-constants.test.ts src/lib/__tests__/portal-feed.test.ts`
Expected: PASS

- [ ] **Step 3: Record any unrelated pre-existing repo failures separately instead of blocking completion**
