import React, { useState } from 'react';
import {
  Wallet,
  Bot,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  RotateCcw,
  Zap,
  ArrowUpRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export function PaperTradingView({
  wallet,
  positions,
  history,
  botConfig,
  setBotConfig,
  onClosePosition,
  onResetWallet,
  onOpenTradeModal,
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isProfitable = wallet.unrealizedPnL >= 0;
  const isTotalProfitable = (wallet.realizedPnL + wallet.unrealizedPnL) >= 0;

  return (
    <div style={{ padding: '0 24px 40px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Portfolio Header Bar */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} color="var(--accent-green)" />
              <span>Paper Trading Portfolio</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Live simulated futures execution with real-time Binance prices and persistent wallet state.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {showResetConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--accent-rose)' }}>Reset to $10,000 USDT?</span>
                <button
                  onClick={() => {
                    onResetWallet();
                    setShowResetConfirm(false);
                  }}
                  className="btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: 'var(--accent-rose)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Reset portfolio to initial $10,000 USDT"
              >
                <RotateCcw size={14} />
                <span>Reset Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}>
          {/* Total Equity */}
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Equity</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ${wallet.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Cash + Margin + PnL
            </div>
          </div>

          {/* Available Cash */}
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Available Balance</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>
              ${wallet.freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Free margin to open
            </div>
          </div>

          {/* Margin in Use */}
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Margin In Use</div>
            <div className="font-mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              ${wallet.marginInUse.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {positions.length} Active Positions
            </div>
          </div>

          {/* Unrealized PnL */}
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Unrealized PnL</div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: isProfitable ? 'var(--accent-green)' : 'var(--accent-rose)',
              }}
            >
              {isProfitable ? `+$${wallet.unrealizedPnL}` : `-$${Math.abs(wallet.unrealizedPnL)}`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Live floating PnL
            </div>
          </div>

          {/* Realized PnL */}
          <div style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Realized PnL</div>
            <div
              className="font-mono"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: wallet.realizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
              }}
            >
              {wallet.realizedPnL >= 0 ? `+$${wallet.realizedPnL}` : `-$${Math.abs(wallet.realizedPnL)}`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {history.length} Closed Trades
            </div>
          </div>
        </div>
      </div>

      {/* 2. Auto-Trader Bot Configuration Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: botConfig.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: botConfig.enabled ? 'var(--accent-green)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bot size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Auto-Trader Bot
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {botConfig.enabled
                  ? 'Active — Automatically buys fresh breakouts detected by the scanner.'
                  : 'Paused — Waiting for activation.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setBotConfig({ enabled: !botConfig.enabled })}
              className="btn"
              style={{
                padding: '8px 18px',
                backgroundColor: botConfig.enabled ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                color: botConfig.enabled ? '#000' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                border: botConfig.enabled ? 'none' : '1px solid var(--border-medium)',
              }}
            >
              {botConfig.enabled ? 'BOT: ACTIVE (ON)' : 'BOT: PAUSED (OFF)'}
            </button>
          </div>
        </div>

        {/* Bot Parameters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          alignItems: 'center',
        }}>
          {/* Margin Per Trade */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Allocation / Trade: <strong className="font-mono" style={{ color: 'var(--accent-green)' }}>{botConfig.marginPercent}%</strong>
            </label>
            <input
              type="range"
              min="1"
              max="25"
              value={botConfig.marginPercent}
              onChange={(e) => setBotConfig({ marginPercent: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--accent-green)' }}
            />
          </div>

          {/* Leverage */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Bot Leverage: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{botConfig.leverage}x</strong>
            </label>
            <select
              value={botConfig.leverage}
              onChange={(e) => setBotConfig({ leverage: parseInt(e.target.value, 10) })}
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
              <option value="1">1x (Spot equivalent)</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>

          {/* Max Concurrent Positions */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Max Open Positions: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{botConfig.maxPositions}</strong>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={botConfig.maxPositions}
              onChange={(e) => setBotConfig({ maxPositions: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          {/* Volume Spike Only */}
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={botConfig.onlyVolumeSpikes}
                onChange={(e) => setBotConfig({ onlyVolumeSpikes: e.target.checked })}
                style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
              />
              <span>Require Volume Surge (2.0x+)</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Active Positions Table Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Active Paper Positions ({positions.length})</span>
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time SL/TP automated monitoring
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                <th style={{ padding: '10px 12px' }}>Symbol</th>
                <th style={{ padding: '10px 12px' }}>Side</th>
                <th style={{ padding: '10px 12px' }}>Entry Price</th>
                <th style={{ padding: '10px 12px' }}>Current Price</th>
                <th style={{ padding: '10px 12px' }}>Margin / Size</th>
                <th style={{ padding: '10px 12px' }}>SL / TP1 / TP2</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Unrealized PnL</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    No active positions currently open. Open a position from the Scanner or activate the Auto-Trader bot.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const pnl = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * pos.notional;
                  const pnlPercent = ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * pos.leverage;
                  const isPosWin = pnl >= 0;

                  return (
                    <tr
                      key={pos.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {pos.symbol}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--accent-green)',
                          fontWeight: 700,
                        }}>
                          {pos.side} {pos.leverage}x
                        </span>
                      </td>
                      <td style={{ padding: '12px' }} className="font-mono">
                        ${pos.entryPrice}
                      </td>
                      <td style={{ padding: '12px' }} className="font-mono">
                        ${pos.currentPrice || pos.entryPrice}
                      </td>
                      <td style={{ padding: '12px' }} className="font-mono">
                        <div>${pos.margin}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(${pos.notional.toFixed(0)})</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px' }} className="font-mono">
                        <div style={{ color: 'var(--accent-rose)' }}>SL: ${pos.stopLossPrice}</div>
                        <div style={{ color: 'var(--accent-green)' }}>TP1: ${pos.takeProfit1Price}</div>
                        <div style={{ color: 'var(--accent-green)' }}>TP2: ${pos.takeProfit2Price}</div>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isPosWin ? 'var(--accent-green)' : 'var(--accent-rose)',
                        }}
                        className="font-mono"
                      >
                        <div>{isPosWin ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}</div>
                        <div style={{ fontSize: '11px' }}>
                          {isPosWin ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => onClosePosition(pos.id, pos.currentPrice, 'MANUAL_CLOSE')}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: 'var(--accent-rose-bg)',
                            color: 'var(--accent-rose)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Closed Trades History Table Card */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Closed Trades History ({history.length})
          </h3>
        </div>

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
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No completed trades yet.
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  const isWin = item.netPnL >= 0;
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.symbol}
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
                          {item.side} {item.leverage}x
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }} className="font-mono">
                        ${item.entryPrice}
                      </td>
                      <td style={{ padding: '10px 12px' }} className="font-mono">
                        ${item.exitPrice}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isWin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          color: isWin ? 'var(--accent-green)' : 'var(--accent-rose)',
                        }}>
                          {item.reason}
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
                        {isWin ? `+$${item.netPnL}` : `-$${Math.abs(item.netPnL)}`}
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
                        {isWin ? `+${item.returnPercent}%` : `${item.returnPercent}%`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
