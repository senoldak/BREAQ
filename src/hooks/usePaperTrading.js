import { useState, useEffect, useCallback, useRef } from 'react';
import {
  applySlippage,
  calculateFee,
  calculatePnL,
  calculateLiquidationPrice,
  evaluateExitConditions,
  DEFAULT_SLIPPAGE,
  DEFAULT_TAKER_FEE,
} from '../services/tradeEngine.js';
import { BREAKOUT_STATUS } from '../services/breakoutEngine.js';

const STORAGE_KEYS = {
  WALLET: 'breaq_paper_wallet_v1',
  POSITIONS: 'breaq_paper_positions_v1',
  HISTORY: 'breaq_paper_history_v1',
  BOT: 'breaq_paper_bot_v1',
};

const DEFAULT_WALLET = {
  balance: 10000,
  realizedPnL: 0,
};

const DEFAULT_BOT = {
  enabled: false,
  marginPercent: 5,
  leverage: 3,
  maxPositions: 5,
  onlyVolumeSpikes: true,
};

export function usePaperTrading(coins = [], isScanning = false) {
  // 1. Initialize State from localStorage safely
  const [wallet, setWallet] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WALLET);
      return saved ? JSON.parse(saved) : DEFAULT_WALLET;
    } catch {
      return DEFAULT_WALLET;
    }
  });

  const [positions, setPositions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POSITIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [botConfig, setBotConfigState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOT);
      return saved ? JSON.parse(saved) : DEFAULT_BOT;
    } catch {
      return DEFAULT_BOT;
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(wallet));
    } catch (e) {
      console.error('Failed to save paper wallet', e);
    }
  }, [wallet]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
    } catch (e) {
      console.error('Failed to save paper positions', e);
    }
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save paper history', e);
    }
  }, [history]);

  const setBotConfig = useCallback((newConfig) => {
    setBotConfigState((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STORAGE_KEYS.BOT, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save bot config', e);
      }
      return updated;
    });
  }, []);

  // Map for fast coin price lookup
  const coinPriceMap = useRef(new Map());
  useEffect(() => {
    const map = new Map();
    for (const c of coins) {
      map.set(c.symbol, c);
    }
    coinPriceMap.current = map;
  }, [coins]);

  // 2. Open Position Action
  const openPosition = useCallback((symbol, marginAmount, leverage = 3, customSL = null, customTP = null) => {
    const coin = coinPriceMap.current.get(symbol);
    if (!coin || coin.price <= 0) return { success: false, error: 'Coin price unavailable' };

    const requiredMargin = parseFloat(marginAmount);
    if (requiredMargin <= 0 || requiredMargin > wallet.balance) {
      return { success: false, error: 'Insufficient available margin' };
    }

    const entryPrice = applySlippage(coin.price, 'BUY', DEFAULT_SLIPPAGE);
    const notional = requiredMargin * leverage;
    const entryFee = calculateFee(notional, DEFAULT_TAKER_FEE);

    const slPrice = customSL || (coin.breakoutPrice > 0 && coin.breakoutPrice < entryPrice
      ? Math.round(coin.breakoutPrice * 0.98 * 10000) / 10000
      : Math.round(entryPrice * 0.97 * 10000) / 10000);

    const tp1Price = customTP || Math.round(entryPrice * 1.06 * 10000) / 10000;
    const tp2Price = Math.round(entryPrice * 1.12 * 10000) / 10000;
    const liqPrice = calculateLiquidationPrice(entryPrice, leverage, 'LONG');

    const newPosition = {
      id: `${symbol}_${Date.now()}`,
      symbol,
      side: 'LONG',
      entryPrice,
      currentPrice: coin.price,
      margin: requiredMargin,
      notional,
      leverage,
      entryFee,
      stopLossPrice: slPrice,
      takeProfit1Price: tp1Price,
      takeProfit2Price: tp2Price,
      liquidationPrice: liqPrice,
      tp1Hit: false,
      highestPrice: entryPrice,
      openTime: Date.now(),
    };

    setWallet((prev) => ({
      ...prev,
      balance: Math.round((prev.balance - requiredMargin - entryFee) * 100) / 100,
    }));

    setPositions((prev) => [newPosition, ...prev]);
    return { success: true, position: newPosition };
  }, [wallet.balance]);

  // 3. Close Position Action
  const closePosition = useCallback((positionId, exitPrice = null, reason = 'MANUAL_CLOSE') => {
    setPositions((prevPositions) => {
      const pos = prevPositions.find((p) => p.id === positionId);
      if (!pos) return prevPositions;

      const finalExitPrice = exitPrice || (coinPriceMap.current.get(pos.symbol)?.price || pos.currentPrice);
      const slippedExitPrice = applySlippage(finalExitPrice, 'SELL', DEFAULT_SLIPPAGE);
      const exitFee = calculateFee(pos.notional, DEFAULT_TAKER_FEE);
      const pnlRes = calculatePnL(pos.entryPrice, slippedExitPrice, pos.notional, pos.leverage, pos.side, exitFee);

      const returnedMargin = Math.max(0, pos.margin + pnlRes.netPnL);

      setWallet((prev) => ({
        ...prev,
        balance: Math.round((prev.balance + returnedMargin) * 100) / 100,
        realizedPnL: Math.round((prev.realizedPnL + pnlRes.netPnL) * 100) / 100,
      }));

      const closedRecord = {
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice: slippedExitPrice,
        margin: pos.margin,
        notional: pos.notional,
        leverage: pos.leverage,
        netPnL: pnlRes.netPnL,
        returnPercent: pnlRes.returnPercent,
        reason,
        openTime: pos.openTime,
        closeTime: Date.now(),
      };

      setHistory((prevH) => [closedRecord, ...prevH]);
      return prevPositions.filter((p) => p.id !== positionId);
    });
  }, []);

  // 4. Real-time Position Monitoring (SL, TP, Liquidation check on price updates)
  useEffect(() => {
    if (positions.length === 0 || coins.length === 0) return;

    for (const pos of positions) {
      const coin = coinPriceMap.current.get(pos.symbol);
      if (!coin) continue;

      const currentPrice = coin.price;
      const lowPrice = coin.low24h || currentPrice;
      const highPrice = coin.high24h || currentPrice;

      // Synthetic candle check for triggers
      const simulatedCandle = { open: currentPrice, high: highPrice, low: lowPrice, close: currentPrice };
      const check = evaluateExitConditions(pos, simulatedCandle, DEFAULT_SLIPPAGE);

      // Check Liquidation
      if (pos.liquidationPrice > 0 && currentPrice <= pos.liquidationPrice) {
        closePosition(pos.id, pos.liquidationPrice, 'LIQUIDATION');
        continue;
      }

      if (check.shouldExit) {
        if (check.partialExit && !pos.tp1Hit) {
          // TP1 50% partial close
          const halfNotional = pos.notional * 0.5;
          const exitFee = calculateFee(halfNotional, DEFAULT_TAKER_FEE);
          const pnlRes = calculatePnL(pos.entryPrice, check.exitPrice, halfNotional, pos.leverage, pos.side, exitFee);

          setWallet((prev) => ({
            ...prev,
            balance: Math.round((prev.balance + (pos.margin * 0.5) + pnlRes.netPnL) * 100) / 100,
            realizedPnL: Math.round((prev.realizedPnL + pnlRes.netPnL) * 100) / 100,
          }));

          setHistory((prevH) => [
            {
              id: `${pos.id}_tp1`,
              symbol: pos.symbol,
              side: pos.side,
              entryPrice: pos.entryPrice,
              exitPrice: check.exitPrice,
              margin: pos.margin * 0.5,
              notional: halfNotional,
              leverage: pos.leverage,
              netPnL: pnlRes.netPnL,
              returnPercent: pnlRes.returnPercent,
              reason: 'TAKE_PROFIT_1 (50%)',
              openTime: pos.openTime,
              closeTime: Date.now(),
            },
            ...prevH,
          ]);

          setPositions((prev) =>
            prev.map((p) =>
              p.id === pos.id
                ? {
                    ...p,
                    notional: halfNotional,
                    margin: pos.margin * 0.5,
                    tp1Hit: true,
                    stopLossPrice: check.newStopLoss || p.entryPrice,
                    currentPrice,
                  }
                : p
            )
          );
        } else {
          closePosition(pos.id, check.exitPrice, check.reason);
        }
      } else {
        // Update current price & unrealized stats
        if (pos.currentPrice !== currentPrice) {
          setPositions((prev) =>
            prev.map((p) => (p.id === pos.id ? { ...p, currentPrice } : p))
          );
        }
      }
    }
  }, [coins, positions, closePosition]);

  // 5. Auto-Trader Bot Execution when Scanner finishes a scan
  const prevScanningRef = useRef(isScanning);
  useEffect(() => {
    // Detect scan completion transition: true -> false
    if (prevScanningRef.current && !isScanning && botConfig.enabled) {
      if (positions.length < botConfig.maxPositions && wallet.balance > 50) {
        // Find best candidates: FRESH_BREAKOUT, not already in positions
        const openSymbols = new Set(positions.map((p) => p.symbol));
        const candidates = coins.filter(
          (c) =>
            c.status === BREAKOUT_STATUS.FRESH_BREAKOUT &&
            !openSymbols.has(c.symbol) &&
            (!botConfig.onlyVolumeSpikes || c.isVolumeSpike)
        );

        if (candidates.length > 0) {
          const toOpen = candidates.slice(0, botConfig.maxPositions - positions.length);
          for (const coin of toOpen) {
            const margin = Math.min(wallet.balance * (botConfig.marginPercent / 100), wallet.balance);
            if (margin >= 20) {
              openPosition(coin.symbol, margin, botConfig.leverage);
            }
          }
        }
      }
    }
    prevScanningRef.current = isScanning;
  }, [isScanning, botConfig, positions, wallet.balance, coins, openPosition]);

  // 6. Reset Wallet Action
  const resetWallet = useCallback(() => {
    setWallet(DEFAULT_WALLET);
    setPositions([]);
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLET);
      localStorage.removeItem(STORAGE_KEYS.POSITIONS);
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('Failed to reset paper storage', e);
    }
  }, []);

  // 7. Calculate Aggregated Portfolio Numbers
  let marginInUse = 0;
  let unrealizedPnL = 0;

  for (const pos of positions) {
    marginInUse += pos.margin;
    const currentPrice = pos.currentPrice || pos.entryPrice;
    const pnl = calculatePnL(pos.entryPrice, currentPrice, pos.notional, pos.leverage, pos.side, 0);
    unrealizedPnL += pnl.rawPnL;
  }

  const equity = Math.round((wallet.balance + marginInUse + unrealizedPnL) * 100) / 100;
  const freeMargin = Math.round(wallet.balance * 100) / 100;

  return {
    wallet: {
      balance: wallet.balance,
      equity,
      marginInUse: Math.round(marginInUse * 100) / 100,
      freeMargin,
      unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
      realizedPnL: wallet.realizedPnL,
    },
    positions,
    history,
    botConfig,
    setBotConfig,
    openPosition,
    closePosition,
    resetWallet,
  };
}
