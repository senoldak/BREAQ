import React, { useState, useMemo, useRef } from 'react';
import {
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Percent,
  Award,
  ShieldAlert,
  BarChart3,
  Calendar,
  Filter,
  DollarSign,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { runCoinBacktest, runMultiCoinBacktest } from '../services/backtestEngine.js';
import { fetchKlines, fetchKlinesBatch } from '../services/binanceApi.js';

export function BacktestView({ coins = [], currentScannerTimeframe = '1d' }) {
  // Strategy & Execution parameters
  const [scope, setScope] = useState('all'); // 'all' or 'single'
  const [selectedSymbol, setSelectedSymbol] = useState(coins[0]?.symbol || 'BTCUSDT');
  const [timeframe, setTimeframe] = useState(currentScannerTimeframe);
  const [allowCoiling, setAllowCoiling] = useState(false);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [positionSizePercent, setPositionSizePercent] = useState(10);
  const [leverage, setLeverage] = useState(3);
  const [slippagePercent, setSlippagePercent] = useState(0.08); // 0.08%
  const [feePercent, setFeePercent] = useState(0.05); // 0.05%

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [results, setResults] = useState(null);
  const [filterTradeType, setFilterTradeType] = useState('ALL'); // 'ALL', 'WINS', 'LOSSES'
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const handleStartBacktest = async () => {
    setIsRunning(true);
    setError(null);
    setProgress({ completed: 0, total: 0, percent: 0 });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const options = {
        initialCapital: parseFloat(initialCapital) || 10000,
        positionSizePercent: parseFloat(positionSizePercent) || 10,
        leverage: parseInt(leverage, 10) || 1,
        slippage: (parseFloat(slippagePercent) || 0.08) / 100,
        feeRate: (parseFloat(feePercent) || 0.05) / 100,
        timeframe,
        allowCoiling,
      };

      if (scope === 'single') {
        setProgress({ completed: 0, total: 1, percent: 30 });
        const candles = await fetchKlines(selectedSymbol, timeframe, 150, controller.signal);
        if (controller.signal.aborted) return;

        if (!candles || candles.length < 35) {
          throw new Error(`Insufficient historical candles found for ${selectedSymbol}.`);
        }

        setProgress({ completed: 1, total: 1, percent: 100 });
        const singleRes = runCoinBacktest(selectedSymbol, candles, options);
        setResults({
          summary: singleRes.metrics,
          trades: singleRes.trades,
          equityCurve: singleRes.equityCurve,
        });
      } else {
        // Multi-coin portfolio backtest on top scanned coins
        const targetCoins = coins.slice(0, Math.min(coins.length, 50));
        if (targetCoins.length === 0) {
          throw new Error('No scanned coins available to backtest. Please wait for the scanner or run a scan.');
        }

        const symbols = targetCoins.map((c) => c.symbol);
        setProgress({ completed: 0, total: symbols.length, percent: 0 });

        const klinesMap = await fetchKlinesBatch(
          symbols,
          timeframe,
          120,
          (completed, total) => {
            const pct = Math.round((completed / total) * 100);
            setProgress({ completed, total, percent: pct });
          },
          6,
          controller.signal
        );

        if (controller.signal.aborted) return;

        const multiRes = runMultiCoinBacktest(klinesMap, options);
        setResults(multiRes);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Backtest error:', err);
      setError(err.message || 'Backtest failed');
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopBacktest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  };

  // Filtered trades for trade log
  const filteredTrades = useMemo(() => {
    if (!results || !results.trades) return [];
    if (filterTradeType === 'WINS') return results.trades.filter((t) => t.netPnL > 0);
    if (filterTradeType === 'LOSSES') return results.trades.filter((t) => t.netPnL <= 0);
    return results.trades;
  }, [results, filterTradeType]);

  // Equity Curve SVG calculation
  const svgChart = useMemo(() => {
    if (!results || !results.equityCurve || results.equityCurve.length < 2) return null;

    const data = results.equityCurve;
    const equities = data.map((d) => d.equity);
    const minVal = Math.min(...equities) * 0.98;
    const maxVal = Math.max(...equities) * 1.02;
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 220;
    const padding = 20;

    const points = data.map((d, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.equity - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const polyline = points.join(' ');
    const area = `${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`;
    const isProfitable = (results.summary?.totalNetPnL || 0) >= 0;

    return {
      polyline,
      area,
      minVal: Math.round(minVal),
      maxVal: Math.round(maxVal),
      isProfitable,
      width,
      height,
    };
  }, [results]);

  return (
    <div style={{ padding: '0 24px 40px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Parameter Control Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="var(--accent-cyan)" />
              <span>Backtest Laboratory</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Evaluate breakout strategies with strict zero look-ahead bias, slippage, and Binance Futures fees.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isRunning ? (
              <button
                onClick={handleStopBacktest}
                className="btn"
                style={{
                  padding: '9px 18px',
                  backgroundColor: 'var(--accent-rose-bg)',
                  color: 'var(--accent-rose)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                <Square size={14} />
                <span>Stop Backtest</span>
              </button>
            ) : (
              <button
                onClick={handleStartBacktest}
                className="btn btn-primary"
                style={{
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Play size={14} />
                <span>Run Backtest</span>
              </button>
            )}
          </div>
        </div>

        {/* Inputs Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          alignItems: 'end',
        }}>
          {/* Scope */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Test Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="all">Top Scanned Coins (Portfolio)</option>
              <option value="single">Single Coin Only</option>
            </select>
          </div>

          {/* Single Coin Selection */}
          {scope === 'single' && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Select Coin
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                {coins.length > 0 ? (
                  coins.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.symbol} ({c.status})
                    </option>
                  ))
                ) : (
                  <option value="BTCUSDT">BTCUSDT</option>
                )}
              </select>
            </div>
          )}

          {/* Timeframe */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="1d">1D (Daily Candles)</option>
              <option value="4h">4H (4-Hour Candles)</option>
            </select>
          </div>

          {/* Initial Capital */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Capital (USDT)
            </label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Position Size % */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Pos. Size / Trade (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={positionSizePercent}
              onChange={(e) => setPositionSizePercent(e.target.value)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Leverage */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Leverage: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{leverage}x</strong>
            </label>
            <select
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="1">1x (Spot)</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>

          {/* Include Coiling Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', height: '38px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={allowCoiling}
                onChange={(e) => setAllowCoiling(e.target.checked)}
                disabled={isRunning}
                style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
              />
              <span>Include Coiling</span>
            </label>
          </div>
        </div>

        {/* Realistic Friction Notice */}
        <div style={{
          marginTop: '14px',
          padding: '8px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}>
          <span>⚡ Execution Realism:</span>
          <span>Slippage: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{slippagePercent}%</strong></span>
          <span>•</span>
          <span>Taker Fee: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{feePercent}%</strong></span>
          <span>•</span>
          <span>TP1: <strong className="font-mono" style={{ color: 'var(--accent-green)' }}>+6% (50% close)</strong></span>
          <span>•</span>
          <span>TP2: <strong className="font-mono" style={{ color: 'var(--accent-green)' }}>+12%</strong></span>
          <span>•</span>
          <span>SL: <strong className="font-mono" style={{ color: 'var(--accent-rose)' }}>-2.5% below breakout</strong></span>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Simulating historical candles...</span>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {progress.completed} / {progress.total} ({progress.percent}%)
              </span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent-cyan)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'var(--accent-rose-bg)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-rose)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {results && (
        <>
          {/* Sample Size Warning if < 30 trades */}
          {results.summary.totalTrades < 30 && (
            <div style={{
              padding: '10px 16px',
              backgroundColor: 'var(--accent-amber-bg)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--accent-amber)',
              fontSize: '13px',
            }}>
              <AlertTriangle size={16} />
              <span>
                Low trade sample size ({results.summary.totalTrades} trades). For statistical significance, consider expanding coin count or testing 4H timeframe.
              </span>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {/* Total Return */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Return</div>
              <div
                className="font-mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: results.summary.totalNetPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
                }}
              >
                {results.summary.totalNetPnL >= 0 ? `+${results.summary.returnPercent}%` : `${results.summary.returnPercent}%`}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }} className="font-mono">
                ${results.summary.totalNetPnL >= 0 ? `+${results.summary.totalNetPnL}` : results.summary.totalNetPnL} USDT
              </div>
            </div>

            {/* Win Rate */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Win Rate</div>
              <div
                className="font-mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: results.summary.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-amber)',
                }}
              >
                {results.summary.winRate}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {results.summary.winningTrades}W / {results.summary.losingTrades}L ({results.summary.totalTrades} total)
              </div>
            </div>

            {/* Profit Factor */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Profit Factor</div>
              <div
                className="font-mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: results.summary.profitFactor >= 1.5 ? 'var(--accent-green)' : (results.summary.profitFactor >= 1 ? 'var(--accent-amber)' : 'var(--accent-rose)'),
                }}
              >
                {results.summary.profitFactor}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {results.summary.profitFactor >= 1.7 ? 'High Quality' : 'Baseline'}
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Max Drawdown (MDD)</div>
              <div
                className="font-mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: results.summary.maxDrawdownPercent <= 15 ? 'var(--accent-green)' : 'var(--accent-rose)',
                }}
              >
                -{results.summary.maxDrawdownPercent}%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Peak-to-trough risk
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Sharpe Ratio</div>
              <div
                className="font-mono"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: results.summary.sharpeRatio >= 1.5 ? 'var(--accent-cyan)' : 'var(--text-primary)',
                }}
              >
                {results.summary.sharpeRatio}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Sortino: <strong className="font-mono">{results.summary.sortinoRatio}</strong>
              </div>
            </div>
          </div>

          {/* Equity Curve Card */}
          {svgChart && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cumulative Portfolio Equity Curve
                </h3>
                <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Start: ${initialCapital} ➔ End: ${Math.round((initialCapital + results.summary.totalNetPnL) * 100) / 100}
                </div>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                  style={{ width: '100%', height: 'auto', maxHeight: '240px', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={svgChart.isProfitable ? 'var(--accent-green)' : 'var(--accent-rose)'} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={svgChart.isProfitable ? 'var(--accent-green)' : 'var(--accent-rose)'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="20" y1="20" x2={svgChart.width - 20} y2="20" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1="20" y1={svgChart.height / 2} x2={svgChart.width - 20} y2={svgChart.height / 2} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1="20" y1={svgChart.height - 20} x2={svgChart.width - 20} y2={svgChart.height - 20} stroke="var(--border-subtle)" strokeDasharray="3 3" />

                  {/* Shaded Area */}
                  <polygon points={svgChart.area} fill="url(#equityGrad)" />

                  {/* Equity Line */}
                  <polyline
                    fill="none"
                    stroke={svgChart.isProfitable ? 'var(--accent-green)' : 'var(--accent-rose)'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgChart.polyline}
                  />

                  {/* Max and Min Labels */}
                  <text x="25" y="16" fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
                    ${svgChart.maxVal}
                  </text>
                  <text x="25" y={svgChart.height - 6} fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
                    ${svgChart.minVal}
                  </text>
                </svg>
              </div>
            </div>
          )}

          {/* Trade Log Table Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Simulated Trade Log ({filteredTrades.length} trades)
              </h3>

              {/* Trade filter buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setFilterTradeType('ALL')}
                  className="btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    backgroundColor: filterTradeType === 'ALL' ? 'var(--bg-tertiary)' : 'transparent',
                    color: filterTradeType === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  All ({results.trades.length})
                </button>
                <button
                  onClick={() => setFilterTradeType('WINS')}
                  className="btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    backgroundColor: filterTradeType === 'WINS' ? 'var(--accent-green-bg)' : 'transparent',
                    color: filterTradeType === 'WINS' ? 'var(--accent-green)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Wins ({results.summary.winningTrades})
                </button>
                <button
                  onClick={() => setFilterTradeType('LOSSES')}
                  className="btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    backgroundColor: filterTradeType === 'LOSSES' ? 'var(--accent-rose-bg)' : 'transparent',
                    color: filterTradeType === 'LOSSES' ? 'var(--accent-rose)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Losses ({results.summary.losingTrades})
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <th style={{ padding: '10px 12px' }}>Symbol</th>
                    <th style={{ padding: '10px 12px' }}>Side</th>
                    <th style={{ padding: '10px 12px' }}>Entry Price</th>
                    <th style={{ padding: '10px 12px' }}>Exit Price</th>
                    <th style={{ padding: '10px 12px' }}>Exit Reason</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net PnL ($)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Return (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No trades found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.slice(0, 100).map((t, idx) => {
                      const isWin = t.netPnL > 0;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                          }}
                        >
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {t.symbol}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: 'var(--accent-green)',
                              fontWeight: 700,
                            }}>
                              LONG
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }} className="font-mono">
                            ${t.entryPrice}
                          </td>
                          <td style={{ padding: '10px 12px' }} className="font-mono">
                            ${t.exitPrice}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isWin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                              color: isWin ? 'var(--accent-green)' : 'var(--accent-rose)',
                            }}>
                              {t.reason}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isWin ? 'var(--accent-green)' : 'var(--accent-rose)',
                            }}
                            className="font-mono"
                          >
                            {isWin ? `+$${t.netPnL}` : `-$${Math.abs(t.netPnL)}`}
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isWin ? 'var(--accent-green)' : 'var(--accent-rose)',
                            }}
                            className="font-mono"
                          >
                            {isWin ? `+${t.returnPercent}%` : `${t.returnPercent}%`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {filteredTrades.length > 100 && (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Showing first 100 trades of {filteredTrades.length}.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
