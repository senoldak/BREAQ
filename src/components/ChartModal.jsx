import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, TrendingDown, Minus, Sparkles, Globe } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { InteractiveChart } from './InteractiveChart.jsx';

function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val < 0.00001) return val.toFixed(8);
  if (val < 0.001) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ChartModal({ coin, onClose }) {
  const containerRef = useRef(null);
  const [chartMode, setChartMode] = useState('auto'); // 'auto' | 'tv'

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Embed TradingView Widget when tv mode is active
  useEffect(() => {
    if (chartMode !== 'tv' || !coin || !containerRef.current) return;

    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    // Map timeframe to TradingView interval
    const tvInterval = coin.timeframe === '4h' ? '240' : 'D';
    const tvSymbol = `BINANCE:${coin.symbol}.P`;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      backgroundColor: 'rgba(13, 17, 26, 1)',
      gridColor: 'rgba(255, 255, 255, 0.05)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com'
    });

    containerRef.current.appendChild(script);
  }, [coin, chartMode]);

  if (!coin) return null;

  const isPositive = coin.change24h >= 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Left: Coin identity & status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              color: 'var(--accent-cyan)',
            }}>
              {coin.baseAsset.slice(0, 3)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {coin.symbol}
                </h2>
                <StatusBadge status={coin.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '2px' }}>
                <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                  ${formatPrice(coin.price)}
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontWeight: '700',
                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-rose)',
                  }}
                >
                  {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Center: Breakout Info Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--bg-primary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                {coin.breakoutType === 'DESCENDING_TRENDLINE' ? (
                  <>
                    <TrendingDown size={12} style={{ color: 'var(--accent-rose)' }} />
                    <span>Descending Trendline Resistance</span>
                  </>
                ) : (
                  <>
                    <Minus size={12} style={{ color: 'var(--accent-cyan)' }} />
                    <span>Horizontal Base Resistance</span>
                  </>
                )}
              </div>
              <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
                ${formatPrice(coin.breakoutPrice)}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distance to Resistance</div>
              <div
                className="font-mono"
                style={{
                  fontWeight: '700',
                  color: coin.distancePercent > 0 ? 'var(--accent-green)' : 'var(--accent-amber)',
                  fontSize: '14px',
                }}
              >
                {coin.distancePercent > 0 ? `+${coin.distancePercent}%` : `${coin.distancePercent}%`}
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Volume Multiplier</div>
              <div className="font-mono" style={{ fontWeight: '700', color: 'var(--accent-cyan)', fontSize: '14px' }}>
                {coin.volumeRatio}x
              </div>
            </div>
          </div>

          {/* Right: Chart Mode Selector & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Toggle Mode: Auto Drawings vs TradingView */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <button
                onClick={() => setChartMode('auto')}
                className="btn"
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: chartMode === 'auto' ? 'var(--bg-tertiary)' : 'transparent',
                  color: chartMode === 'auto' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: chartMode === 'auto' ? '1px solid var(--border-medium)' : '1px solid transparent',
                }}
              >
                <Sparkles size={13} />
                <span>Auto Drawings</span>
              </button>
              <button
                onClick={() => setChartMode('tv')}
                className="btn"
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: chartMode === 'tv' ? 'var(--bg-tertiary)' : 'transparent',
                  color: chartMode === 'tv' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: chartMode === 'tv' ? '1px solid var(--border-medium)' : '1px solid transparent',
                }}
              >
                <Globe size={13} />
                <span>TradingView</span>
              </button>
            </div>

            <a
              href={`https://www.binance.com/en/futures/${coin.symbol}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ padding: '7px 12px', fontSize: '12px' }}
            >
              <span>Binance Futures</span>
              <ExternalLink size={14} />
            </a>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px', borderRadius: 'var(--radius-md)' }}
              title="Close (ESC)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body: Either InteractiveChart (Auto drawings) or TradingView Widget */}
        <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
          {chartMode === 'auto' ? (
            <InteractiveChart coin={coin} />
          ) : (
            <div
              ref={containerRef}
              className="tradingview-widget-container"
              style={{ height: '100%', width: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
