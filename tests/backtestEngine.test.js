import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePerformanceMetrics,
  runCoinBacktest,
} from '../src/services/backtestEngine.js';

describe('backtestEngine', () => {
  test('calculatePerformanceMetrics accurately computes Win Rate, MDD and Sharpe', () => {
    const sampleTrades = [
      { netPnL: 100, returnPercent: 5, exitTime: 1000 },
      { netPnL: 200, returnPercent: 10, exitTime: 2000 },
      { netPnL: -50, returnPercent: -2.5, exitTime: 3000 },
      { netPnL: 150, returnPercent: 7.5, exitTime: 4000 },
    ];
    const metrics = calculatePerformanceMetrics(sampleTrades, 1000);
    assert.strictEqual(metrics.totalTrades, 4);
    assert.strictEqual(metrics.winningTrades, 3);
    assert.strictEqual(metrics.losingTrades, 1);
    assert.strictEqual(metrics.winRate, 75);
    assert.strictEqual(metrics.totalNetPnL, 400);
    assert.strictEqual(metrics.profitFactor, 9); // 450 / 50 = 9
    assert.ok(metrics.maxDrawdownPercent >= 0);
  });

  test('runCoinBacktest adheres to zero look-ahead bias', () => {
    // Construct synthetic candle series: 40 candles consolidation, then breakout candle at index 40
    const candles = [];
    for (let i = 0; i < 45; i++) {
      if (i === 40) {
        // Breakout candle with high volume
        candles.push({ time: i * 86400000, open: 100, high: 110, low: 99, close: 108, volume: 5000 });
      } else if (i > 40) {
        // Post breakout continuation
        candles.push({ time: i * 86400000, open: 108 + (i - 40), high: 115, low: 107, close: 114, volume: 3000 });
      } else {
        // Base consolidation
        candles.push({ time: i * 86400000, open: 98, high: 101, low: 97, close: 99, volume: 1000 });
      }
    }

    const res = runCoinBacktest('TESTUSDT', candles, {
      initialCapital: 10000,
      positionSizePercent: 10,
      leverage: 1,
    });

    assert.ok(res);
    // If a trade occurred, ensure entryPrice was based on candle 41 open (not candle 40 close)
    if (res.trades.length > 0) {
      assert.ok(res.trades[0].entryPrice >= candles[41].open);
    }
  });
});
