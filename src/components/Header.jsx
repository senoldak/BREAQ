import React from 'react';
import { RefreshCw, Search, Clock, TrendingUp, Zap } from 'lucide-react';

export function Header({
  searchQuery,
  onSearchChange,
  timeframe,
  onTimeframeChange,
  isScanning,
  progress,
  lastScanTime,
  onScanNow,
  currentMode = 'scanner',
  onModeChange,
  paperPositionCount = 0,
  paperUnrealizedPnL = 0,
}) {
  return (
    <header style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      padding: '14px 24px',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px var(--accent-green-glow)',
        }}>
          <TrendingUp size={22} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              BREAQ
            </h1>
            <span style={{
              fontSize: '11px',
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              fontWeight: '600',
            }}>
              FUTURES USDT-M
            </span>
            <span className="live-indicator" title="Live Binance Connection" />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Breakout Scanner, Quantitative Backtesting & Paper Trading
          </p>
        </div>
      </div>

      {/* Main Mode Navigation: Scanner | Backtest | Paper Trading */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-medium)',
        gap: '4px',
      }}>
        <button
          onClick={() => onModeChange('scanner')}
          className="btn"
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: currentMode === 'scanner' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentMode === 'scanner' ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontWeight: currentMode === 'scanner' ? '700' : '500',
            border: currentMode === 'scanner' ? '1px solid var(--border-medium)' : '1px solid transparent',
          }}
        >
          <span>⚡ Scanner</span>
        </button>

        <button
          onClick={() => onModeChange('backtest')}
          className="btn"
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: currentMode === 'backtest' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentMode === 'backtest' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: currentMode === 'backtest' ? '700' : '500',
            border: currentMode === 'backtest' ? '1px solid var(--border-medium)' : '1px solid transparent',
          }}
        >
          <span>🧪 Backtest Lab</span>
        </button>

        <button
          onClick={() => onModeChange('paper')}
          className="btn"
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: currentMode === 'paper' ? 'var(--bg-tertiary)' : 'transparent',
            color: currentMode === 'paper' ? 'var(--accent-green)' : 'var(--text-secondary)',
            fontWeight: currentMode === 'paper' ? '700' : '500',
            border: currentMode === 'paper' ? '1px solid var(--border-medium)' : '1px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💼 Paper Trading</span>
          {paperPositionCount > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: paperUnrealizedPnL >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                color: paperUnrealizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
                fontWeight: 700,
              }}
            >
              {paperPositionCount} pos ({paperUnrealizedPnL >= 0 ? `+$${paperUnrealizedPnL}` : `-$${Math.abs(paperUnrealizedPnL)}`})
            </span>
          )}
        </button>
      </div>

      {/* Controls: Search, Timeframe, Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search Box */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search Coin (e.g. PHA, ARB, LDO)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 36px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              width: '240px',
              transition: 'all var(--transition-fast)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-green)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
          />
        </div>

        {/* Timeframe Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => onTimeframeChange('1d')}
            className="btn"
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: timeframe === '1d' ? 'var(--accent-green)' : 'transparent',
              color: timeframe === '1d' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '700',
            }}
          >
            1D (Daily)
          </button>
          <button
            onClick={() => onTimeframeChange('4h')}
            className="btn"
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: timeframe === '4h' ? 'var(--accent-cyan)' : 'transparent',
              color: timeframe === '4h' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: '700',
            }}
          >
            4H (4-Hour)
          </button>
        </div>

        {/* Scan Button */}
        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="btn btn-primary"
          style={{
            minWidth: '130px',
            opacity: isScanning ? 0.85 : 1,
            cursor: isScanning ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={15} style={{ animation: isScanning ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isScanning ? `Scanning ${progress.percent}%` : 'Scan Now'}</span>
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
