/**
 * Breakout & Trend Analysis Engine
 * Detects:
 * 1. Descending Trendline Breakouts
 * 2. Horizontal Base / Consolidation Breakouts
 * 3. Volume Spikes
 * 4. 3-Stage Classification: COILING (Pre-Breakout), FRESH_BREAKOUT (Fresh Breakout), EXTENDED (Overbought)
 */

export const BREAKOUT_STATUS = {
  COILING: 'COILING',                 // Coiling / Pre-Breakout (-4.0% to 0.0%)
  FRESH_BREAKOUT: 'FRESH_BREAKOUT',   // Fresh Breakout (0% to +15%, last 1-3 candles, volume confirmed)
  EXTENDED: 'EXTENDED',               // Extended / Overbought (> +20% or RSI > 75)
  NONE: 'NONE',                       // Neutral / In downtrend or not near inflection level
};

/**
 * Calculates Wilder's RSI for given candles
 */
export function calculateRsi(candles, period = 14) {
  if (!candles || candles.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed RSI for the remaining candles
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  // Flat price / zero volatility: neutral momentum (Wilder's convention)
  if (avgLoss === 0 && avgGain === 0) return 50;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - (100 / (1 + rs))) * 10) / 10;
}

/**
 * Finds local Swing Highs (peaks) within a sliding window
 */
export function findSwingHighs(candles, window = 2) {
  const highs = [];
  const len = candles.length;

  for (let i = window; i < len - window; i++) {
    const currentHigh = candles[i].high;
    let isPeak = true;

    for (let j = 1; j <= window; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high > currentHigh) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      highs.push({ index: i, high: currentHigh, time: candles[i].time });
    }
  }

  return highs;
}

/**
 * Finds descending resistance trendline connecting lower highs
 * Uses breakoutWindow to ensure breakout candles do not invalidate the historical trendline
 */
export function calculateDescendingTrendline(candles, swingHighs, breakoutWindow = 3) {
  if (!swingHighs || swingHighs.length < 2) return null;

  const len = candles.length;
  // Look at recent swing highs
  const recentHighs = swingHighs.slice(-6);
  let bestLine = null;

  // Historical line validation excludes the breakout evaluation window
  const validationEndIndex = Math.max(0, len - 1 - breakoutWindow);

  for (let i = 0; i < recentHighs.length - 1; i++) {
    for (let j = i + 1; j < recentHighs.length; j++) {
      const p1 = recentHighs[i];
      const p2 = recentHighs[j];

      // Slope must be descending (p2 is lower than p1 and occurred after p1)
      if (p2.high < p1.high && p2.index > p1.index) {
        const slope = (p2.high - p1.high) / (p2.index - p1.index);
        const intercept = p1.high - slope * p1.index;

        // Current projected resistance value at the latest candle
        const currentProjected = slope * (len - 1) + intercept;

        // Check whether intermediate highs prior to breakout window pierced above line
        let violated = false;
        for (let k = p1.index; k <= validationEndIndex; k++) {
          const expectedLineVal = slope * k + intercept;
          // Allow minor wick penetration up to 2.5%
          if (candles[k].high > expectedLineVal * 1.025) {
            violated = true;
            break;
          }
        }

        if (!violated && currentProjected > 0) {
          bestLine = {
            slope,
            intercept,
            projectedResistance: currentProjected,
            startIndex: p1.index,
            endIndex: p2.index,
          };
          break;
        }
      }
    }
    if (bestLine) break;
  }

  return bestLine;
}

/**
 * Calculates the consolidation base resistance (horizontal resistance)
 */
export function calculateBaseResistance(candles, lookback = 30) {
  if (!candles || candles.length < lookback) return null;

  const slice = candles.slice(-lookback, -3); // Exclude the very latest 3 candles to find established base
  if (slice.length === 0) return null;

  // Maximum close in the consolidation base (per spec §3.2)
  const maxClose = Math.max(...slice.map((c) => c.close));
  return maxClose;
}

/**
 * Full Breakout Analysis for a Coin
 * @param {Array} candles - Array of OHLCV candles
 * @param {number} currentPrice - Current price from ticker
 * @param {string} timeframe - '1d' or '4h'
 */
export function analyzeBreakout(candles, currentPrice, timeframe = '1d') {
  if (!candles || candles.length < 30) {
    return null;
  }

  const latestCandle = candles[candles.length - 1];
  const price = currentPrice || latestCandle.close;

  // 1. Calculate Technicals
  const rsi = calculateRsi(candles, 14);

  // Volume SMA 20
  const volSlice = candles.slice(-21, -1);
  const avgVol = volSlice.reduce((sum, c) => sum + c.volume, 0) / (volSlice.length || 1);
  const volumeRatio = avgVol > 0 ? Math.round((latestCandle.volume / avgVol) * 100) / 100 : 1;

  // 2. Identify Swing Highs and Trendline
  const swingHighs = findSwingHighs(candles, 2);
  const trendline = calculateDescendingTrendline(candles, swingHighs, 3);
  const baseResistance = calculateBaseResistance(candles, Math.min(candles.length - 5, 35));

  // Determine active breakout level: prioritize descending trendline if valid, else horizontal base
  let breakoutPrice = 0;
  let breakoutType = 'HORIZONTAL_BASE';

  if (trendline && trendline.projectedResistance > 0) {
    breakoutPrice = trendline.projectedResistance;
    breakoutType = 'DESCENDING_TRENDLINE';
  } else if (baseResistance && baseResistance > 0) {
    breakoutPrice = baseResistance;
    breakoutType = 'HORIZONTAL_BASE';
  } else {
    // Fallback: 20-period highest high
    breakoutPrice = Math.max(...candles.slice(-20).map((c) => c.high));
    breakoutType = 'LOCAL_HIGH';
  }

  // 3. Distance to Breakout (%)
  const safeBreakoutPrice = breakoutPrice > 0 ? breakoutPrice : price;
  const distancePercent = safeBreakoutPrice > 0
    ? Math.round(((price - safeBreakoutPrice) / safeBreakoutPrice) * 1000) / 10
    : 0;

  // 4. Past 7-period performance (7 days on 1D, 28 hours on 4H: 7 candles of 4h = 28h)
  const lookbackPeriod = 7;
  const pastCandle = candles[Math.max(0, candles.length - lookbackPeriod)];
  const pastClose = pastCandle && pastCandle.close > 0 ? pastCandle.close : price;
  const pastGainPercent = pastClose > 0
    ? Math.round(((price - pastClose) / pastClose) * 1000) / 10
    : 0;

  // Check whether a breakout occurred within the last 1-3 candles
  const recentCandles = candles.slice(-3);
  const brokeOutRecently = recentCandles.some(
    (c) => c.close >= safeBreakoutPrice || c.high >= safeBreakoutPrice * 1.01
  );
  const isVolumeConfirmed = volumeRatio >= 1.5;

  // 5. 3-Stage Classification
  let status = BREAKOUT_STATUS.NONE;

  if (distancePercent > 20 || pastGainPercent > 35 || rsi > 75) {
    // Extended / Overbought (High pullback risk)
    status = BREAKOUT_STATUS.EXTENDED;
  } else if (distancePercent > 0 && distancePercent <= 15 && brokeOutRecently && isVolumeConfirmed) {
    // Fresh Breakout (Just broke resistance, early stage, volume confirmed, recent)
    status = BREAKOUT_STATUS.FRESH_BREAKOUT;
  } else if (distancePercent >= -4.0 && distancePercent <= 0 && pastGainPercent < 18) {
    // Coiling / Pre-Breakout (Right under resistance, unpumped, e.g. ARB, LDO)
    status = BREAKOUT_STATUS.COILING;
  } else if (distancePercent > 12 && distancePercent <= 20) {
    // Transition zone: already extended from initial breakout
    status = BREAKOUT_STATUS.EXTENDED;
  }

  return {
    timeframe,
    currentPrice: price,
    breakoutPrice: Math.round(safeBreakoutPrice * 10000) / 10000,
    breakoutType,
    distancePercent,
    volumeRatio,
    rsi,
    pastGainPercent,
    status,
    isVolumeSpike: volumeRatio >= 2.0,
    trendline,
    swingHighs,
    baseResistance,
  };
}
