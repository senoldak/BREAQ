import { useState, useEffect, useCallback, useRef } from 'react';
import { getActiveFuturesPairs, get24hTickers, fetchKlinesBatch } from '../services/binanceApi.js';
import { analyzeBreakout, BREAKOUT_STATUS } from '../services/breakoutEngine.js';

export function useScanner() {
  const [coins, setCoins] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [timeframe, setTimeframe] = useState('1d'); // '1d' or '4h'
  const [lastScanTime, setLastScanTime] = useState(null);
  const [error, setError] = useState(null);

  // Computed counts
  const [stats, setStats] = useState({
    totalScanned: 0,
    freshCount: 0,
    coilingCount: 0,
    extendedCount: 0,
    volumeSpikeCount: 0,
  });

  const isScanningRef = useRef(false);
  const abortControllerRef = useRef(null);

  const scanNow = useCallback(async (tf = timeframe) => {
    // If a scan is already running, abort it to switch seamlessly
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isScanningRef.current = true;
    setIsScanning(true);
    setError(null);
    setProgress({ completed: 0, total: 0, percent: 0 });

    try {
      // 1. Fetch active pairs and 24h tickers
      const [pairs, tickers] = await Promise.all([
        getActiveFuturesPairs(controller.signal),
        get24hTickers(controller.signal)
      ]);

      if (controller.signal.aborted) return;

      // Filter and sort by 24h volume (descending) to scan active and liquid pairs
      const validPairs = pairs.filter((p) => tickers.has(p.symbol));
      validPairs.sort((a, b) => {
        const volA = tickers.get(a.symbol)?.quoteVolume || 0;
        const volB = tickers.get(b.symbol)?.quoteVolume || 0;
        return volB - volA;
      });

      // Filter by 24h volume: target all liquid pairs with quoteVolume >= $1M USDT
      // Covers 250+ active pairs per spec §4.1 while filtering illiquid dust
      const liquidPairs = validPairs.filter((p) => {
        const vol = tickers.get(p.symbol)?.quoteVolume || 0;
        return vol >= 1_000_000;
      });
      const targetPairs = liquidPairs.length >= 250
        ? liquidPairs
        : validPairs.slice(0, Math.min(validPairs.length, 250));

      const symbols = targetPairs.map((p) => p.symbol);

      setProgress({ completed: 0, total: symbols.length, percent: 0 });

      // 2. Batch fetch klines
      const klinesMap = await fetchKlinesBatch(
        symbols,
        tf,
        90,
        (completed, total) => {
          const percent = Math.round((completed / total) * 100);
          setProgress({ completed, total, percent });
        },
        8, // concurrency
        controller.signal
      );

      if (controller.signal.aborted) return;

      // 3. Analyze each coin for breakouts
      const analyzedCoins = [];
      let fresh = 0;
      let coiling = 0;
      let extended = 0;
      let volumeSpike = 0;

      for (const pair of targetPairs) {
        const klines = klinesMap.get(pair.symbol);
        const ticker = tickers.get(pair.symbol);

        if (klines && ticker) {
          const analysis = analyzeBreakout(klines, ticker.lastPrice, tf);
          if (analysis) {
            const coinData = {
              symbol: pair.symbol,
              baseAsset: pair.baseAsset,
              quoteAsset: pair.quoteAsset,
              price: ticker.lastPrice,
              change24h: ticker.priceChangePercent,
              quoteVolume: ticker.quoteVolume,
              high24h: ticker.highPrice,
              low24h: ticker.lowPrice,
              ...analysis,
            };

            analyzedCoins.push(coinData);

            if (analysis.status === BREAKOUT_STATUS.FRESH_BREAKOUT) fresh++;
            else if (analysis.status === BREAKOUT_STATUS.COILING) coiling++;
            else if (analysis.status === BREAKOUT_STATUS.EXTENDED) extended++;

            if (analysis.isVolumeSpike) volumeSpike++;
          }
        }
      }

      // Sort by status priority (FRESH_BREAKOUT first, then COILING, then EXTENDED, then NONE)
      // and secondary sort by volumeRatio descending
      const statusPriority = {
        [BREAKOUT_STATUS.FRESH_BREAKOUT]: 1,
        [BREAKOUT_STATUS.COILING]: 2,
        [BREAKOUT_STATUS.EXTENDED]: 3,
        [BREAKOUT_STATUS.NONE]: 4,
      };

      analyzedCoins.sort((a, b) => {
        const pDiff = (statusPriority[a.status] || 4) - (statusPriority[b.status] || 4);
        if (pDiff !== 0) return pDiff;
        return b.volumeRatio - a.volumeRatio;
      });

      setCoins(analyzedCoins);
      setStats({
        totalScanned: analyzedCoins.length,
        freshCount: fresh,
        coilingCount: coiling,
        extendedCount: extended,
        volumeSpikeCount: volumeSpike,
      });
      setLastScanTime(new Date());
    } catch (err) {
      if (err.name === 'AbortError') return; // Cancelled silently
      console.error('Scan error:', err);
      setError('Failed to fetch Binance market data: ' + (err.message || 'Unknown error'));
    } finally {
      if (abortControllerRef.current === controller) {
        setIsScanning(false);
        isScanningRef.current = false;
      }
    }
  }, [timeframe]);

  // Initial scan on mount
  useEffect(() => {
    scanNow(timeframe);

    // Periodic background scan every 4 minutes
    const interval = setInterval(() => {
      scanNow(timeframe);
    }, 4 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [scanNow, timeframe]);

  const handleTimeframeChange = (newTf) => {
    if (newTf !== timeframe) {
      setTimeframe(newTf);
      scanNow(newTf);
    }
  };

  return {
    coins,
    isScanning,
    progress,
    stats,
    timeframe,
    setTimeframe: handleTimeframeChange,
    lastScanTime,
    error,
    scanNow: () => scanNow(timeframe),
  };
}
