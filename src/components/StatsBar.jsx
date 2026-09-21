import React from 'react';
import { Flame, Compass, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';

export function StatsBar({ stats, isScanning, progress, activeTab, onTabSelect }) {
  const cards = [
    {
      id: 'fresh',
      title: 'Fresh Breakouts',
      desc: 'Broke resistance in last 1-3 candles (e.g., PHA breakout)',
      count: stats.freshCount,
      icon: Flame,
      color: 'var(--accent-green)',
      bgColor: 'var(--accent-green-bg)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      glow: 'var(--shadow-glow-green)',
    },
    {
      id: 'coiling',
      title: 'Coiling / Pre-Breakout',
      desc: 'Right below resistance, unpumped (e.g., ARB, LDO)',
      count: stats.coilingCount,
      icon: Compass,
      color: 'var(--accent-amber)',
      bgColor: 'var(--accent-amber-bg)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      glow: 'var(--shadow-glow-amber)',
    },
    {
      id: 'volume',
      title: 'Volume Surge',
      desc: 'Pairs with 2x+ volume expansion',
      count: stats.volumeSpikeCount,
      icon: Zap,
      color: 'var(--accent-cyan)',
      bgColor: 'var(--accent-cyan-bg)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      glow: '0 0 16px var(--accent-cyan-glow)',
    },
    {
      id: 'extended',
      title: 'Extended / Overbought',
      desc: 'Gained 20%+, elevated pullback risk',
      count: stats.extendedCount,
      icon: AlertTriangle,
      color: 'var(--accent-rose)',
      bgColor: 'var(--accent-rose-bg)',
      borderColor: 'rgba(244, 63, 94, 0.3)',
      glow: 'var(--shadow-glow-rose)',
    },
  ];

  return (
    <div style={{ padding: '20px 24px 10px 24px' }}>
      {/* Progress Bar during scan */}
      {isScanning && (
        <div style={{
          marginBottom: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Scanning Binance USDT-M Futures ({progress.completed}/{progress.total} pairs)...
            </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: '700' }} className="font-mono">
              %{progress.percent}
            </span>
          </div>
          <div style={{
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
              transition: 'width 0.2s ease-out',
            }} />
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}>
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = activeTab === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onTabSelect(card.id)}
              className="glass-card"
              style={{
                padding: '18px 20px',
                cursor: 'pointer',
                borderColor: isSelected ? card.color : 'var(--border-subtle)',
                boxShadow: isSelected ? card.glow : 'var(--shadow-sm)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {card.title}
                  </span>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: card.color,
                    marginTop: '4px',
                  }} className="font-mono">
                    {card.count}
                  </div>
                </div>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: card.bgColor,
                  border: `1px solid ${card.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}>
                  <Icon size={20} />
                </div>
              </div>
              <p style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '8px',
                lineHeight: '1.4',
              }}>
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
