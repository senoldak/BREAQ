import {
  applySlippage,
  calculateFee,
  calculatePnL,
  evaluateExitConditions,
  DEFAULT_SLIPPAGE,
  DEFAULT_TAKER_FEE,
} from './tradeEngine.js';
import { analyzeBreakout, BREAKOUT_STATUS } from './breakoutEngine.js';

export function calculatePerformanceMetrics(trades, initialCapital = 10000) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalNetPnL: 0,
      returnPercent: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      avgTradePnL: 0,
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let totalNetPnL = 0;

  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let currentEquity = initialCapital;
  const returns = [];

  for (const trade of trades) {
    const pnl = trade.netPnL;
    totalNetPnL += pnl;
    currentEquity += pnl;

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    } else {
      const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    if (pnl > 0) {
      grossProfit += pnl;
      wins++;
    } else if (pnl < 0) {
      grossLoss += Math.abs(pnl);
      losses++;
    }

    returns.push(trade.returnPercent);
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0;
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : (grossProfit > 0 ? 99 : 0);
  const returnPercent = Math.round((totalNetPnL / initialCapital) * 1000) / 10;
  const avgTradePnL = Math.round((totalNetPnL / totalTrades) * 100) / 100;

  // Calculate Sharpe and Sortino
  const meanReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);

  const downsideVariance = returns
    .filter((r) => r < 0)
    .reduce((sum, r) => sum + Math.pow(r, 2), 0) / (returns.length || 1);
  const downsideDev = Math.sqrt(downsideVariance);

  const sharpeRatio = stdDev > 0 ? Math.round(((meanReturn / stdDev) * Math.sqrt(365)) * 100) / 100 : 0;
  const sortinoRatio = downsideDev > 0 ? Math.round(((meanReturn / downsideDev) * Math.sqrt(365)) * 100) / 100 : 0;

  return {
    totalTrades,
    winningTrades: wins,
    losingTrades: losses,
    winRate,
    totalNetPnL: Math.round(totalNetPnL * 100) / 100,
    returnPercent,
    profitFactor,
    maxDrawdownPercent: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio,
    sortinoRatio,
    avgTradePnL,
  };
}

export function runCoinBacktest(symbol, candles, options = {}) {
  const {
    initialCapital = 10000,
    positionSizePercent = 10,
    leverage = 1,
    slippage = DEFAULT_SLIPPAGE,
    feeRate = DEFAULT_TAKER_FEE,
    timeframe = '1d',
    allowCoiling = false,
  } = options;

  if (!candles || candles.length < 35) {
    return { trades: [], metrics: calculatePerformanceMetrics([], initialCapital), equityCurve: [] };
  }

  let equity = initialCapital;
  const equityCurve = [{ time: candles[30].time, equity: initialCapital }];
  const trades = [];
  let openPosition = null;

  for (let i = 30; i < candles.length - 1; i++) {
    const historicalSlice = candles.slice(0, i + 1);
    const currentCandle = candles[i];
    const nextCandle = candles[i + 1];

    // 1. Manage Open Position on nextCandle
    if (openPosition) {
      // Update highest price seen for trailing stop
      if (nextCandle.high > openPosition.highestPrice) {
        openPosition.highestPrice = nextCandle.high;
      }

      const exitCheck = evaluateExitConditions(openPosition, nextCandle, slippage);

      if (exitCheck.shouldExit) {
        if (exitCheck.partialExit && !openPosition.tp1Hit) {
          // Take Profit 1: Close 50%
          const closedNotional = openPosition.notional * 0.5;
          const feeExit = calculateFee(closedNotional, feeRate);
          const pnlRes = calculatePnL(openPosition.entryPrice, exitCheck.exitPrice, closedNotional, leverage, 'LONG', feeExit);

          trades.push({
            symbol,
            entryTime: openPosition.entryTime,
            entryPrice: openPosition.entryPrice,
            exitTime: nextCandle.time,
            exitPrice: exitCheck.exitPrice,
            side: 'LONG',
            reason: 'TAKE_PROFIT_1 (50%)',
            notional: closedNotional,
            netPnL: pnlRes.netPnL,
            returnPercent: pnlRes.returnPercent,
          });

          equity += pnlRes.netPnL;
          openPosition.notional = openPosition.notional * 0.5;
          openPosition.tp1Hit = true;
          openPosition.stopLossPrice = exitCheck.newStopLoss || openPosition.entryPrice;
        } else {
          // Full Exit (Stop Loss or TP2 or Trailing Stop)
          const feeExit = calculateFee(openPosition.notional, feeRate);
          const pnlRes = calculatePnL(openPosition.entryPrice, exitCheck.exitPrice, openPosition.notional, leverage, 'LONG', feeExit);

          trades.push({
            symbol,
            entryTime: openPosition.entryTime,
            entryPrice: openPosition.entryPrice,
            exitTime: nextCandle.time,
            exitPrice: exitCheck.exitPrice,
            side: 'LONG',
            reason: exitCheck.reason,
            notional: openPosition.notional,
            netPnL: pnlRes.netPnL,
            returnPercent: pnlRes.returnPercent,
          });

          equity += pnlRes.netPnL;
          openPosition = null;
        }
      }
    }

    // 2. Check for New Entry Signal at currentCandle Close (Executes at nextCandle Open)
    if (!openPosition) {
      const analysis = analyzeBreakout(historicalSlice, currentCandle.close, timeframe);
      const isSignal = analysis && (
        analysis.status === BREAKOUT_STATUS.FRESH_BREAKOUT ||
        (allowCoiling && analysis.status === BREAKOUT_STATUS.COILING)
      );

      if (isSignal && nextCandle) {
        // Zero look-ahead bias: fill at nextCandle.open + slippage
        const entryPrice = applySlippage(nextCandle.open, 'BUY', slippage);
        const positionNotional = (equity * (positionSizePercent / 100)) * leverage;
        const entryFee = calculateFee(positionNotional, feeRate);

        // Deduct entry fee
        equity -= entryFee;

        // Dynamic Stop Loss: just under breakout level (or 3% below entry)
        const slPrice = analysis.breakoutPrice > 0 && analysis.breakoutPrice < entryPrice
          ? Math.round(analysis.breakoutPrice * 0.98 * 10000) / 10000
          : Math.round(entryPrice * 0.97 * 10000) / 10000;

        const tp1Price = Math.round(entryPrice * 1.06 * 10000) / 10000;
        const tp2Price = Math.round(entryPrice * 1.12 * 10000) / 10000;

        openPosition = {
          symbol,
          entryTime: nextCandle.time,
          entryPrice,
          notional: positionNotional,
          stopLossPrice: slPrice,
          takeProfit1Price: tp1Price,
          takeProfit2Price: tp2Price,
          tp1Hit: false,
          highestPrice: entryPrice,
        };
      }
    }

    equityCurve.push({ time: nextCandle.time, equity: Math.round(equity * 100) / 100 });
  }

  const metrics = calculatePerformanceMetrics(trades, initialCapital);
  return { trades, metrics, equityCurve };
}

export function runMultiCoinBacktest(candlesMap, options = {}, onProgress = null) {
  const allTrades = [];
  const entries = Array.from(candlesMap.entries());
  let completed = 0;

  for (const [symbol, candles] of entries) {
    const res = runCoinBacktest(symbol, candles, options);
    allTrades.push(...res.trades);
    completed++;
    if (onProgress) {
      onProgress(completed, entries.length);
    }
  }

  // Sort trades chronologically by exitTime
  allTrades.sort((a, b) => a.exitTime - b.exitTime);

  // Build unified portfolio equity curve
  let portEquity = options.initialCapital || 10000;
  const equityCurve = [{ time: allTrades[0]?.entryTime || Date.now(), equity: portEquity }];

  for (const trade of allTrades) {
    portEquity += trade.netPnL;
    equityCurve.push({ time: trade.exitTime, equity: Math.round(portEquity * 100) / 100 });
  }

  const metrics = calculatePerformanceMetrics(allTrades, options.initialCapital || 10000);
  return { summary: metrics, trades: allTrades, equityCurve };
}
