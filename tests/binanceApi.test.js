import test from 'node:test';
import assert from 'node:assert/strict';
import { getActiveFuturesPairs, get24hTickers, fetchKlines, fetchKlinesBatch } from '../src/services/binanceApi.js';

test('Binance Futures API - getActiveFuturesPairs returns valid USDT-M pairs', async () => {
  const pairs = await getActiveFuturesPairs();
  assert.ok(Array.isArray(pairs), 'Pairs should be an array');
  assert.ok(pairs.length > 50, `Expected > 50 pairs, got ${pairs.length}`);

  // Verify all are USDT quote assets and not stablecoin/index pairs
  for (const p of pairs) {
    assert.equal(p.quoteAsset, 'USDT', `${p.symbol} should have USDT quote asset`);
    assert.notEqual(p.symbol, 'USDCUSDT', 'Should not contain USDCUSDT');
    assert.notEqual(p.symbol, 'BUSDUSDT', 'Should not contain BUSDUSDT');
  }

  // Ensure major pairs exist
  const symbols = new Set(pairs.map(p => p.symbol));
  assert.ok(symbols.has('BTCUSDT'), 'Should include BTCUSDT');
  assert.ok(symbols.has('ETHUSDT'), 'Should include ETHUSDT');
  assert.ok(symbols.has('PHAUSDT'), 'Should include PHAUSDT (user example)');
});

test('Binance Futures API - get24hTickers returns price and volume map', async () => {
  const tickers = await get24hTickers();
  assert.ok(tickers instanceof Map, 'Tickers should be a Map');
  assert.ok(tickers.has('BTCUSDT'), 'Should contain BTCUSDT ticker');

  const btc = tickers.get('BTCUSDT');
  assert.ok(typeof btc.lastPrice === 'number' && btc.lastPrice > 0, 'BTC price should be positive');
  assert.ok(typeof btc.priceChangePercent === 'number', 'Price change should be number');
  assert.ok(typeof btc.quoteVolume === 'number' && btc.quoteVolume > 0, 'Volume should be positive');
});

test('Binance Futures API - fetchKlines respects AbortSignal', async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await fetchKlines('BTCUSDT', '1d', 10, controller.signal);
    },
    { name: 'AbortError' }
  );
});

test('Binance Futures API - fetchKlines returns formatted OHLCV and caches result', async () => {
  const klines = await fetchKlines('BTCUSDT', '1d', 10);
  assert.ok(Array.isArray(klines), 'Klines should be an array');
  assert.ok(klines.length > 0, 'Klines should have data');

  const candle = klines[0];
  assert.ok(typeof candle.time === 'number');
  assert.ok(typeof candle.open === 'number');
  assert.ok(typeof candle.high === 'number');
  assert.ok(typeof candle.low === 'number');
  assert.ok(typeof candle.close === 'number');
  assert.ok(typeof candle.volume === 'number');

  // Verify caching
  const cachedKlines = await fetchKlines('BTCUSDT', '1d', 10);
  assert.equal(cachedKlines, klines, 'Subsequent call within TTL should return cached object');
});
