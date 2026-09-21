/**
 * Core Trade & Execution Engine
 * Handles:
 * 1. Slippage modeling
 * 2. Binance USDT-M taker/maker fees
 * 3. Dynamic Multi-Stage Exit (SL, TP1 50% + breakeven SL, TP2 / Trailing Stop)
 * 4. Liquidation price and Net PnL calculations
 */

export const DEFAULT_SLIPPAGE = 0.0008; // 0.08%
export const DEFAULT_TAKER_FEE = 0.0005; // 0.05%

/**
 * Adjusts price for slippage
 * Long buy gets worse price (higher), sell gets worse price (lower)
 */
export function applySlippage(price, action = 'BUY', slippage = DEFAULT_SLIPPAGE) {
  if (action === 'BUY') {
    return Math.round(price * (1 + slippage) * 100000) / 100000;
  }
  return Math.round(price * (1 - slippage) * 100000) / 100000;
}

/**
 * Calculates exchange fee on notional position size
 */
export function calculateFee(notional, feeRate = DEFAULT_TAKER_FEE) {
  return Math.round(notional * feeRate * 10000) / 10000;
}

/**
 * Calculates estimated liquidation price based on leverage and side
 */
export function calculateLiquidationPrice(entryPrice, leverage = 1, side = 'LONG') {
  if (leverage <= 1) return 0;
  const maintenanceBuffer = 0.9; // 90% margin loss
  if (side === 'LONG') {
    return Math.round(entryPrice * (1 - (maintenanceBuffer / leverage)) * 10000) / 10000;
  }
  return Math.round(entryPrice * (1 + (maintenanceBuffer / leverage)) * 10000) / 10000;
}

/**
 * Calculates Gross and Net PnL including fees
 */
export function calculatePnL(entryPrice, exitPrice, notional, leverage = 1, side = 'LONG', totalFees = 0) {
  if (entryPrice <= 0) return { rawPnL: 0, netPnL: 0, returnPercent: 0 };
  const priceDiff = side === 'LONG' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
  const returnPercent = Math.round(((priceDiff / entryPrice) * 100) * 100) / 100;
  const rawPnL = Math.round(((notional * priceDiff) / entryPrice) * 100) / 100;
  const netPnL = Math.round((rawPnL - totalFees) * 100) / 100;

  return { rawPnL, netPnL, returnPercent };
}

/**
 * Evaluates whether a candle hits Stop Loss, Take Profit 1, Take Profit 2, or Trailing Stop
 */
export function evaluateExitConditions(position, candle, slippage = DEFAULT_SLIPPAGE) {
  const { entryPrice, stopLossPrice, takeProfit1Price, takeProfit2Price, tp1Hit, highestPrice } = position;

  // 1. Check Stop Loss
  if (candle.low <= stopLossPrice) {
    const exitPrice = applySlippage(Math.min(candle.open, stopLossPrice), 'SELL', slippage);
    return {
      shouldExit: true,
      exitPrice,
      reason: 'STOP_LOSS',
      partialExit: false,
    };
  }

  // 2. Check Take Profit 1 (if not hit yet)
  if (!tp1Hit && takeProfit1Price && candle.high >= takeProfit1Price) {
    const exitPrice = applySlippage(takeProfit1Price, 'SELL', slippage);
    return {
      shouldExit: true,
      exitPrice,
      reason: 'TAKE_PROFIT_1',
      partialExit: true,
      newStopLoss: entryPrice, // Move SL to breakeven
    };
  }

  // 3. Check Take Profit 2
  if (takeProfit2Price && candle.high >= takeProfit2Price) {
    const exitPrice = applySlippage(takeProfit2Price, 'SELL', slippage);
    return {
      shouldExit: true,
      exitPrice,
      reason: 'TAKE_PROFIT_2',
      partialExit: false,
    };
  }

  // 4. Trailing stop after TP1: if price drops 3% from highest price reached
  if (tp1Hit && highestPrice && highestPrice > entryPrice * 1.05) {
    const trailingStop = highestPrice * 0.97;
    if (candle.low <= trailingStop) {
      const exitPrice = applySlippage(trailingStop, 'SELL', slippage);
      return {
        shouldExit: true,
        exitPrice,
        reason: 'TRAILING_STOP',
        partialExit: false,
      };
    }
  }

  return { shouldExit: false };
}
