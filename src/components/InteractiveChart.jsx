import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { fetchKlines } from '../services/binanceApi.js';
import { analyzeBreakout, BREAKOUT_STATUS } from '../services/breakoutEngine.js';
import { Loader2, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val < 0.00001) return val.toFixed(8);
  if (val < 0.001) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InteractiveChart({ coin }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const loadAndRenderChart = async () => {
    if (!coin || !chartContainerRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const interval = coin.timeframe === '4h' ? '4h' : '1d';
      const candles = await fetchKlines(coin.symbol, interval, 120);

      if (!candles || candles.length < 20) {
        throw new Error('Insufficient candlestick data received.');
      }

      // Calculate breakout analysis from candles
      const result = analyzeBreakout(candles, coin.price, interval);
      setAnalysis(result);

      // Clean up existing chart instance
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      chartContainerRef.current.innerHTML = '';

      // Lightweight Charts Configuration
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#0d111a' },
          textColor: '#94a3b8',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
        },
        crosshair: {
          mode: 1, // Magnet / normal crosshair
          vertLine: {
            color: '#64748b',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#1e293b',
          },
          horzLine: {
            color: '#64748b',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#1e293b',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          scaleMargins: {
            top: 0.1,
            bottom: 0.2, // Bottom margin for volume bars
          },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      });

      chartInstanceRef.current = chart;

      // 1. Candlestick Series (Lightweight Charts v5 API: chart.addSeries(CandlestickSeries, options))
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });

      // Convert timestamp to seconds (Lightweight Charts expects Unix timestamp in seconds)
      const chartData = candles.map((c) => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candleSeries.setData(chartData);

      // 2. Volume Series (v5 API: chart.addSeries(HistogramSeries, options))
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // Separate scale
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData = candles.map((c) => ({
        time: Math.floor(c.time / 1000),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }));

      volumeSeries.setData(volumeData);

      // 3. Price Lines: Resistance / Breakout Level
      if (result.breakoutPrice > 0) {
        candleSeries.createPriceLine({
          price: result.breakoutPrice,
          color: '#38bdf8', // Cyan
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `RESISTANCE ($${formatPrice(result.breakoutPrice)})`,
        });
      }

      // Stop-Loss and Target Level Calculation
      // Stop Loss: Lowest point of the last 15 candles (Swing Low)
      const recentLows = candles.slice(-15).map((c) => c.low);
      const swingLow = Math.min(...recentLows);

      if (swingLow > 0 && swingLow < result.breakoutPrice) {
        // SL Price Line
        candleSeries.createPriceLine({
          price: swingLow,
          color: '#f43f5e', // Rose / Red
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `STOP-LOSS ($${formatPrice(swingLow)})`,
        });

        // TP Price Line (1.5R Target)
        const risk = result.breakoutPrice - swingLow;
        const tpPrice = result.breakoutPrice + risk * 1.5;

        candleSeries.createPriceLine({
          price: tpPrice,
          color: '#22c55e', // Bright Green
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `TARGET 1.5R ($${formatPrice(tpPrice)})`,
        });
      }

      // 4. Descending Trendline (Trendline LineSeries)
      if (result.trendline && result.trendline.startIndex !== undefined && result.trendline.endIndex !== undefined) {
        const p1Candle = candles[result.trendline.startIndex];
        const p2Candle = candles[result.trendline.endIndex];
        const lastCandle = candles[candles.length - 1];

        if (p1Candle && p2Candle && lastCandle) {
          const trendlineSeries = chart.addSeries(LineSeries, {
            color: '#f59e0b', // Amber / Gold
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            crosshairMarkerVisible: false,
            priceLineVisible: false,
          });

          // Project trendline from p1 through p2 to the latest candle
          const lineData = [];
          for (let i = result.trendline.startIndex; i < candles.length; i++) {
            const val = result.trendline.slope * i + result.trendline.intercept;
            if (val > 0) {
              lineData.push({
                time: Math.floor(candles[i].time / 1000),
                value: val,
              });
            }
          }

          if (lineData.length >= 2) {
            trendlineSeries.setData(lineData);
          }
        }
      }

      // 5. Breakout Signal Markers (Markers: v5 createSeriesMarkers)
      const markers = [];
      if (result.status === BREAKOUT_STATUS.FRESH_BREAKOUT) {
        const targetCandle = candles[candles.length - 1];
        markers.push({
          time: Math.floor(targetCandle.time / 1000),
          position: 'belowBar',
          color: '#10b981',
          shape: 'arrowUp',
          text: '🚀 FRESH BREAKOUT',
          size: 2,
        });
      } else if (result.status === BREAKOUT_STATUS.COILING) {
        const targetCandle = candles[candles.length - 1];
        markers.push({
          time: Math.floor(targetCandle.time / 1000),
          position: 'belowBar',
          color: '#f59e0b',
          shape: 'circle',
          text: '⏳ COILING (Setup)',
          size: 2,
        });
      }

      if (markers.length > 0) {
        createSeriesMarkers(candleSeries, markers);
      }

      // Fit content to view latest candles
      chart.timeScale().fitContent();

      // Responsive Resize Observer
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 50);

      setLoading(false);
    } catch (err) {
      console.error('Interactive chart load error:', err);
      setError(err.message || 'Failed to load chart data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAndRenderChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [coin.symbol, coin.timeframe]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawings Legend / Status Bar */}
      <div style={{
        padding: '8px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#38bdf8', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Resistance Level:</span>
            <span className="font-mono" style={{ color: '#38bdf8', fontWeight: '600' }}>
              ${formatPrice(analysis?.breakoutPrice || coin.breakoutPrice)}
            </span>
          </div>

          {analysis?.trendline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Descending Trendline:</span>
              <span style={{ color: '#f59e0b', fontWeight: '600' }}>Active</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Target (1.5R):</span>
            <span className="font-mono" style={{ color: '#22c55e', fontWeight: '600' }}>
              Active Level
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#f43f5e', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Stop-Loss:</span>
            <span className="font-mono" style={{ color: '#f43f5e', fontWeight: '600' }}>
              Swing Low
            </span>
          </div>
        </div>

        <button
          onClick={loadAndRenderChart}
          title="Refresh Chart"
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Chart Canvas */}
      <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(13, 17, 26, 0.85)',
            zIndex: 10,
            gap: '12px',
          }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Loading {coin.symbol} candlestick data and automated technical drawings...
            </span>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0d111a',
            zIndex: 10,
            gap: '12px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <AlertCircle size={36} style={{ color: 'var(--accent-rose)' }} />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Failed to Load Chart
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '360px' }}>
              {error}
            </div>
            <button
              onClick={loadAndRenderChart}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px', marginTop: '8px' }}
            >
              Retry
            </button>
          </div>
        )}

        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
