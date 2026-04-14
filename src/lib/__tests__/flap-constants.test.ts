import { describe, expect, test } from 'vitest';

import {
  BNB_MAINNET_CHAIN_ID,
  FLAP_PORTAL_ADDRESSES,
  NATIVE_TOKEN_SENTINEL,
} from '../flap/constants';

describe('Flap constants', () => {
  test('exposes the expected BNB mainnet protocol values', () => {
    expect(BNB_MAINNET_CHAIN_ID).toBe(56);
    expect(FLAP_PORTAL_ADDRESSES[BNB_MAINNET_CHAIN_ID]).toBe(
      '0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0',
    );
    expect(NATIVE_TOKEN_SENTINEL).toBe(
      '0x0000000000000000000000000000000000000000',
    );
  });
});
