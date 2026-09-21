import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeBreakout,
  calculateRsi,
  findSwingHighs,
  calculateDescendingTrendline,
  BREAKOUT_STATUS
} from '../src/services/breakoutEngine.js';

test('Breakout Engine - calculateRsi calculates accurate RSI values and handles zero volatility', () => {
  // Test with uptrend (should have RSI > 70)
  const upCandles = [];
  for (let i = 0; i < 30; i++) {
    upCandles.push({ close: 10 + i });
  }
  const rsiUp = calculateRsi(upCandles);
  assert.ok(rsiUp > 70, `RSI in strong uptrend should be > 70, got ${rsiUp}`);

  // Test with downtrend (should have RSI < 30)
  const downCandles = [];
  for (let i = 0; i < 30; i++) {
    downCandles.push({ close: 50 - i });
  }
  const rsiDown = calculateRsi(downCandles);
  assert.ok(rsiDown < 30, `RSI in strong downtrend should be < 30, got ${rsiDown}`);

  // Test flat price / zero volatility (Wilder's convention: neutral momentum = 50)
  const flatCandles = Array.from({ length: 30 }, () => ({ close: 25 }));
  const rsiFlat = calculateRsi(flatCandles);
  assert.equal(rsiFlat, 50, `RSI for flat price should be 50, got ${rsiFlat}`);
});

test('Breakout Engine - identifies COILING (Pre-Breakout) coin', () => {
  // Simulating coin consolidating right below horizontal resistance 10.0
  const candles = [];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    // Price oscillates between 9.3 and 10.0, establishing resistance at 10.0
    let p = 9.5 + Math.sin(i / 2) * 0.3;
    if (i === 15 || i === 35) p = 10.0; // established base resistance at 10.0
    candles.push({
      time: now - (62 - i) * 86400000,
      open: p - 0.1,
      high: Math.max(10.0, p + 0.1),
      low: p - 0.2,
      close: p,
      volume: 1000
    });
  }
  // Latest candles consolidating at 9.8 (-2% below resistance 10.0)
  candles.push({
    time: now - 86400000,
    open: 9.7,
    high: 9.85,
    low: 9.6,
    close: 9.8,
    volume: 900
  });
  candles.push({
    time: now,
    open: 9.8,
    high: 9.85,
    low: 9.75,
    close: 9.8,
    volume: 950
  });

  const result = analyzeBreakout(candles, 9.8, '1d');
  assert.ok(result, 'Result should exist');
  assert.equal(result.status, BREAKOUT_STATUS.COILING, `Expected COILING, got ${result.status}`);
  assert.ok(result.distancePercent >= -4.0 && result.distancePercent <= 0, `Distance should be between -4% and 0%, got ${result.distancePercent}%`);
});

test('Breakout Engine - identifies FRESH_BREAKOUT coin like PHA with descending trendline', () => {
  const now = Date.now();
  const candles = [];

  // 50 candles in downtrend with clear swing highs at index 10 and 30
  for (let i = 0; i < 50; i++) {
    let p = 20 - (i / 50) * 10;
    if (i === 10) p = 18.5; // Peak 1
    if (i === 30) p = 14.5; // Peak 2
    candles.push({
      time: now - (53 - i) * 86400000,
      open: p,
      high: p + 0.3,
      low: p - 0.3,
      close: p,
      volume: 1000
    });
  }
  // Breakout candle: surges above the line with 3.5x volume
  candles.push({
    time: now - 86400000,
    open: 10.0,
    high: 11.2,
    low: 9.9,
    close: 11.0,
    volume: 3500 // Volume spike
  });
  // Current candle holding the breakout
  candles.push({
    time: now,
    open: 11.0,
    high: 11.5,
    low: 10.8,
    close: 11.3,
    volume: 3000
  });

  const result = analyzeBreakout(candles, 11.3, '1d');
  assert.ok(result, 'Result should exist');
  assert.equal(result.status, BREAKOUT_STATUS.FRESH_BREAKOUT, `Expected FRESH_BREAKOUT, got ${result.status}`);
  assert.equal(result.breakoutType, 'DESCENDING_TRENDLINE', `Expected DESCENDING_TRENDLINE, got ${result.breakoutType}`);
  assert.ok(result.volumeRatio >= 1.5, `Volume ratio should be >= 1.5, got ${result.volumeRatio}`);
  assert.ok(result.distancePercent > 0 && result.distancePercent <= 15, `Distance should be between 0% and 15%, got ${result.distancePercent}%`);
});

test('Breakout Engine - rejects breakout without volume confirmation', () => {
  const now = Date.now();
  const candles = [];
  for (let i = 0; i < 50; i++) {
    candles.push({
      time: now - (52 - i) * 86400000,
      open: 10,
      high: 10.5,
      low: 9.5,
      close: 10,
      volume: 1000
    });
  }
  // Drifts up to 10.8 (+8%) but with weak volume (0.8x)
  candles.push({
    time: now,
    open: 10.2,
    high: 10.8,
    low: 10.1,
    close: 10.8,
    volume: 800
  });

  const result = analyzeBreakout(candles, 10.8, '1d');
  assert.ok(result, 'Result should exist');
  assert.notEqual(result.status, BREAKOUT_STATUS.FRESH_BREAKOUT, 'Low volume breakout must not be FRESH_BREAKOUT');
});

test('Breakout Engine - identifies EXTENDED coin with high distance or RSI', () => {
  const now = Date.now();
  const candles = [];
  for (let i = 0; i < 50; i++) {
    const p = 10 + (i / 50) * 15; // Rallies from 10 to 25 (+150%)
    candles.push({
      time: now - (51 - i) * 86400000,
      open: p - 0.2,
      high: p + 0.5,
      low: p - 0.2,
      close: p,
      volume: 2000
    });
  }

  const result = analyzeBreakout(candles, 25.0, '1d');
  assert.ok(result, 'Result should exist');
  assert.equal(result.status, BREAKOUT_STATUS.EXTENDED, `Expected EXTENDED, got ${result.status}`);
});
