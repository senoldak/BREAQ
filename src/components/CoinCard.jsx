import React from 'react';
import { StatusBadge } from './StatusBadge.jsx';
import { LineChart, ExternalLink, Zap, TrendingDown, Minus } from 'lucide-react';

function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val < 0.00001) return val.toFixed(8);
  if (val < 0.001) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CoinCard({ coin, onSelectCoin, onPaperTrade }) {
  const isPositive = coin.change24h >= 0;

  return (
    <div
      onClick={() => onSelectCoin(coin)}
      className="glass-card"
      style={{
        padding: '16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '11px',
            color: 'var(--accent-cyan)',
          }}>
            {coin.baseAsset.slice(0, 3)}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
              {coin.symbol}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {coin.breakoutType === 'DESCENDING_TRENDLINE' ? (
                <>
                  <TrendingDown size={12} style={{ color: 'var(--accent-rose)' }} />
                  <span>Descending Trend</span>
                </>
              ) : (
                <>
                  <Minus size={12} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Horizontal Base</span>
                </>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={coin.status} />
      </div>

      {/* Prices Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Price</div>
          <div className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
            ${formatPrice(coin.price)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>24h Change</div>
          <div
            className="font-mono"
            style={{
              fontWeight: '700',
              color: isPositive ? 'var(--accent-green)' : 'var(--accent-rose)',
              fontSize: '14px',
            }}
          >
            {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Breakout Level</div>
          <div className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
            ${formatPrice(coin.breakoutPrice)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distance</div>
          <div
            className="font-mono"
            style={{
              fontWeight: '700',
              color: coin.distancePercent > 0 ? 'var(--accent-green)' : 'var(--accent-amber)',
              fontSize: '12px',
            }}
          >
            {coin.distancePercent > 0 ? `+${coin.distancePercent}%` : `${coin.distancePercent}%`}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Volume:</span>
          <span className="font-mono" style={{ fontWeight: '700', color: coin.volumeRatio >= 2 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
            {coin.volumeRatio}x
          </span>
          {coin.isVolumeSpike && <Zap size={13} color="var(--accent-cyan)" fill="var(--accent-cyan)" />}
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>RSI: </span>
          <span className="font-mono" style={{ fontWeight: '600', color: coin.rsi > 70 ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
            {coin.rsi}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {onPaperTrade && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPaperTrade(coin);
            }}
            className="btn"
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-green)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
            title="Open Paper Trade"
          >
            <Zap size={13} />
            <span>Trade</span>
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectCoin(coin);
          }}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
        >
          <LineChart size={14} />
          <span>Inspect Chart</span>
        </button>
        <a
          href={`https://www.binance.com/en/futures/${coin.symbol}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="btn btn-ghost"
          style={{ padding: '7px 10px' }}
          title="Open on Binance"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
