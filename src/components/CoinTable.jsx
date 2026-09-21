import React, { useState } from 'react';
import { StatusBadge } from './StatusBadge.jsx';
import { ArrowUpDown, ExternalLink, LineChart, Zap, TrendingDown, Minus } from 'lucide-react';

function formatPrice(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val < 0.00001) return val.toFixed(8);
  if (val < 0.001) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(val) {
  if (!val) return '-';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

const statusPriority = {
  FRESH_BREAKOUT: 1,
  COILING: 2,
  EXTENDED: 3,
  NONE: 4,
};

export function CoinTable({ coins, onSelectCoin, onPaperTrade }) {
  const [sortField, setSortField] = useState('volumeRatio');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedCoins = [...coins].sort((a, b) => {
    if (sortField === 'status') {
      const pDiff = (statusPriority[a.status] || 4) - (statusPriority[b.status] || 4);
      if (pDiff !== 0) return sortOrder === 'asc' ? pDiff : -pDiff;
      return sortOrder === 'asc' ? a.volumeRatio - b.volumeRatio : b.volumeRatio - a.volumeRatio;
    }

    let valA = a[sortField];
    let valB = b[sortField];
    if (valA === undefined) valA = 0;
    if (valB === undefined) valB = 0;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{
      overflowX: 'auto',
      width: '100%',
      padding: '0 24px 40px 24px',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0 8px',
        textAlign: 'left',
      }}>
        <thead>
          <tr style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>PAIR</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('price')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>PRICE</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('change24h')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>24H CHANGE</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('breakoutPrice')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>BREAKOUT LEVEL</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('distancePercent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>DISTANCE</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('volumeRatio')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>VOLUME (x)</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('rsi')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>RSI(14)</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => handleSort('status')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>STATUS</span>
                <ArrowUpDown size={13} />
              </div>
            </th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {sortedCoins.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                No coins found matching this filter or scanning is still in progress.
              </td>
            </tr>
          ) : (
            sortedCoins.map((coin) => {
              const isPositive = coin.change24h >= 0;
              return (
                <tr
                  key={coin.symbol}
                  onClick={() => onSelectCoin(coin)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.transform = 'scale(1.002)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {/* Symbol */}
                  <td style={{ padding: '14px 16px', borderTopLeftRadius: 'var(--radius-md)', borderBottomLeftRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
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
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>
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
                  </td>

                  {/* Price */}
                  <td style={{ padding: '14px 16px' }}>
                    <span className="font-mono" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      ${formatPrice(coin.price)}
                    </span>
                  </td>

                  {/* 24h Change */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      className="font-mono"
                      style={{
                        fontWeight: '700',
                        color: isPositive ? 'var(--accent-green)' : 'var(--accent-rose)',
                      }}
                    >
                      {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
                    </span>
                  </td>

                  {/* Breakout Price */}
                  <td style={{ padding: '14px 16px' }}>
                    <div className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      ${formatPrice(coin.breakoutPrice)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Resistance Level
                    </div>
                  </td>

                  {/* Distance % */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="font-mono"
                        style={{
                          fontWeight: '700',
                          color: coin.distancePercent > 0 ? 'var(--accent-green)' : 'var(--accent-amber)',
                        }}
                      >
                        {coin.distancePercent > 0 ? `+${coin.distancePercent}%` : `${coin.distancePercent}%`}
                      </span>
                    </div>
                  </td>

                  {/* Volume Ratio */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="font-mono"
                        style={{
                          fontWeight: '700',
                          color: coin.volumeRatio >= 2 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        }}
                      >
                        {coin.volumeRatio}x
                      </span>
                      {coin.isVolumeSpike && (
                        <span title="Volume Surge">
                          <Zap size={14} color="var(--accent-cyan)" fill="var(--accent-cyan)" />
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">
                      24h: {formatVolume(coin.quoteVolume)}
                    </div>
                  </td>

                  {/* RSI */}
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      className="font-mono"
                      style={{
                        fontWeight: '600',
                        color: coin.rsi > 70 ? 'var(--accent-rose)' : (coin.rsi < 35 ? 'var(--accent-green)' : 'var(--text-secondary)'),
                      }}
                    >
                      {coin.rsi}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={coin.status} />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      {onPaperTrade && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPaperTrade(coin);
                          }}
                          className="btn"
                          style={{
                            padding: '6px 10px',
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
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="Open Live Chart"
                      >
                        <LineChart size={14} />
                        <span>Chart</span>
                      </button>
                      <a
                        href={`https://www.binance.com/en/futures/${coin.symbol}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-ghost"
                        style={{ padding: '6px' }}
                        title="Open on Binance Futures"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
