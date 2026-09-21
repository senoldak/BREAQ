/**
 * Binance USDT-M Futures API Service
 * Endpoint: https://fapi.binance.com
 */

const FAPI_BASE_URL = 'https://fapi.binance.com';

// In-memory cache for klines and tickers
const cache = {
  klines: new Map(), // key: `${symbol}_${interval}` -> { timestamp, data }
  exchangeInfo: null,
  exchangeInfoTimestamp: 0,
};

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function pruneExpiredCache() {
  const now = Date.now();
  if (cache.klines.size > 500) {
    for (const [key, val] of cache.klines.entries()) {
      if (now - val.timestamp > CACHE_TTL_MS * 2) {
        cache.klines.delete(key);
      }
    }
  }
}

/**
 * Fetches all active USDT-M perpetual futures pairs
 * Filters out spot-only, non-USDT, and stablecoin pairs
 */
export async function getActiveFuturesPairs(signal = null) {
  const now = Date.now();
  if (cache.exchangeInfo && (now - cache.exchangeInfoTimestamp < CACHE_TTL_MS * 5)) {
    return cache.exchangeInfo;
  }

  try {
    const res = await fetch(`${FAPI_BASE_URL}/fapi/v1/exchangeInfo`, { signal });
    if (!res.ok) throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
    const data = await res.json();

    const ignoredSymbols = new Set(['USDCUSDT', 'BUSDUSDT', 'FDUSDUSDT', 'TUSDUSDT', 'BTCDOMUSDT']);

    const validPairs = data.symbols
      .filter((s) => 
        s.status === 'TRADING' &&
        s.contractType === 'PERPETUAL' &&
        s.quoteAsset === 'USDT' &&
        !ignoredSymbols.has(s.symbol)
      )
      .map((s) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        pricePrecision: s.pricePrecision,
        quantityPrecision: s.quantityPrecision,
      }));

    cache.exchangeInfo = validPairs;
    cache.exchangeInfoTimestamp = now;
    return validPairs;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to fetch Binance Futures exchangeInfo:', err);
    throw err;
  }
}

/**
 * Fetches 24-hour ticker statistics for all pairs
 * Returns a Map: symbol -> tickerData
 */
export async function get24hTickers(signal = null) {
  try {
    const res = await fetch(`${FAPI_BASE_URL}/fapi/v1/ticker/24hr`, { signal });
    if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
    const data = await res.json();

    const tickerMap = new Map();
    for (const item of data) {
      tickerMap.set(item.symbol, {
        lastPrice: parseFloat(item.lastPrice),
        priceChangePercent: parseFloat(item.priceChangePercent),
        quoteVolume: parseFloat(item.quoteVolume),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
      });
    }
    return tickerMap;
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.error('Failed to fetch 24h tickers:', err);
    throw err;
  }
}

/**
 * Fetches candlestick (kline) data for a single symbol with exponential backoff on 429
 * Format: [openTime, open, high, low, close, volume, closeTime, quoteVolume, count, takerBuyBase, takerBuyQuote, ignore]
 */
export async function fetchKlines(symbol, interval = '1d', limit = 90, signal = null) {
  const cacheKey = `${symbol}_${interval}`;
  const now = Date.now();
  pruneExpiredCache();

  const cached = cache.klines.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    if (signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    try {
      const res = await fetch(`${FAPI_BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { signal });
      
      // Monitor rate limit weight
      const usedWeight = res.headers?.get('x-mbx-used-weight-1m');
      if (usedWeight && parseInt(usedWeight, 10) > 1000) {
        console.warn(`Binance Futures 1m weight high: ${usedWeight}/1200`);
      }

      if (res.status === 429) {
        attempt++;
        const retryAfter = res.headers?.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
        console.warn(`Binance rate limit hit for ${symbol}! Backing off for ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch klines for ${symbol}: ${res.status}`);
      }

      const rawData = await res.json();
      const formattedCandles = rawData.map((c) => ({
        time: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        quoteVolume: parseFloat(c[7]),
      }));

      cache.klines.set(cacheKey, { timestamp: now, data: formattedCandles });
      return formattedCandles;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      attempt++;
      if (attempt >= maxRetries) {
        console.warn(`Error fetching klines for ${symbol} after ${maxRetries} attempts:`, err.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }

  return null;
}

/**
 * Batched kline fetcher with concurrency limiter, AbortSignal support, and courteous pause
 * @param {Array<string>} symbols - List of symbols to fetch
 * @param {string} interval - '1d' or '4h'
 * @param {number} limit - Number of candles (e.g. 90)
 * @param {function} onProgress - Callback (completed, total)
 * @param {number} concurrency - Max parallel requests (default 8)
 * @param {AbortSignal} signal - Optional cancellation signal
 */
export async function fetchKlinesBatch(symbols, interval = '1d', limit = 90, onProgress = null, concurrency = 8, signal = null) {
  const results = new Map();
  let completed = 0;
  const total = symbols.length;

  for (let i = 0; i < total; i += concurrency) {
    if (signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }

    const chunk = symbols.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (symbol) => {
      try {
        const klines = await fetchKlines(symbol, interval, limit, signal);
        if (klines && klines.length > 0) {
          results.set(symbol, klines);
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
      }
      completed++;
      if (onProgress && !signal?.aborted) {
        onProgress(completed, total);
      }
    });

    await Promise.all(chunkPromises);

    // Courteous pause between chunks to protect client network & Binance weight
    if (i + concurrency < total && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  return results;
}
