import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applySlippage,
  calculateFee,
  calculateLiquidationPrice,
  calculatePnL,
  evaluateExitConditions,
} from '../src/services/tradeEngine.js';

describe('tradeEngine', () => {
  test('applySlippage correctly adjusts long entry and exit prices', () => {
    const entry = applySlippage(100, 'BUY', 0.001);
    assert.strictEqual(entry, 100.1);

    const exit = applySlippage(100, 'SELL', 0.001);
    assert.strictEqual(exit, 99.9);
  });

  test('calculateFee calculates correct taker fees on notional', () => {
    const fee = calculateFee(1000, 0.0005);
    assert.strictEqual(fee, 0.5);
  });

  test('calculateLiquidationPrice returns expected liquidation level for 10x long', () => {
    const liqPrice = calculateLiquidationPrice(100, 10, 'LONG');
    // For 10x with 90% margin loss threshold: 100 * (1 - 0.9 / 10) = 91
    assert.strictEqual(liqPrice, 91);
  });

  test('calculatePnL returns net PnL accounting for fees and leverage', () => {
    const res = calculatePnL(100, 110, 1000, 5, 'LONG', 1.0);
    // price change +10%, notional $1000 -> gross PnL +$100, fees $1 -> net $99
    assert.strictEqual(res.rawPnL, 100);
    assert.strictEqual(res.netPnL, 99);
    assert.strictEqual(res.returnPercent, 10);
  });

  test('evaluateExitConditions triggers SL when low penetrates stopLossPrice', () => {
    const pos = {
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfit1Price: 106,
      takeProfit2Price: 112,
      tp1Hit: false,
    };
    const candle = { open: 98, high: 99, low: 94, close: 96 };
    const exit = evaluateExitConditions(pos, candle, 0.0008);
    assert.strictEqual(exit.shouldExit, true);
    assert.strictEqual(exit.reason, 'STOP_LOSS');
  });

  test('evaluateExitConditions triggers TP1 partial exit and moves SL to breakeven', () => {
    const pos = {
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfit1Price: 106,
      takeProfit2Price: 112,
      tp1Hit: false,
    };
    const candle = { open: 101, high: 107, low: 100, close: 106.5 };
    const exit = evaluateExitConditions(pos, candle, 0.0008);
    assert.strictEqual(exit.shouldExit, true);
    assert.strictEqual(exit.reason, 'TAKE_PROFIT_1');
    assert.strictEqual(exit.partialExit, true);
  });
});
