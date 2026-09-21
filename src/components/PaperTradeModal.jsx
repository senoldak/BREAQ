import React, { useState } from 'react';
import { X, Zap, Shield, Target, AlertCircle, ArrowUpRight } from 'lucide-react';
import { calculateLiquidationPrice } from '../services/tradeEngine.js';

export function PaperTradeModal({ coin, wallet, onOpenPosition, onClose }) {
  const [margin, setMargin] = useState(
    Math.min(200, Math.max(20, Math.round((wallet?.freeMargin || 1000) * 0.05)))
  );
  const [leverage, setLeverage] = useState(5);
  const [customSL, setCustomSL] = useState(
    coin.breakoutPrice > 0 && coin.breakoutPrice < coin.price
      ? (coin.breakoutPrice * 0.98).toFixed(4)
      : (coin.price * 0.97).toFixed(4)
  );
  const [customTP, setCustomTP] = useState((coin.price * 1.06).toFixed(4));
  const [error, setError] = useState(null);

  const notional = margin * leverage;
  const liqPrice = calculateLiquidationPrice(coin.price, leverage, 'LONG');

  const handleConfirm = () => {
    if (margin > (wallet?.freeMargin || 0)) {
      setError('Insufficient free margin in your paper wallet.');
      return;
    }
    const res = onOpenPosition(coin.symbol, margin, leverage, parseFloat(customSL), parseFloat(customTP));
    if (res && res.success) {
      onClose();
    } else {
      setError(res?.error || 'Failed to open position');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-green)',
            }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Paper Long: {coin.symbol}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Current Price: <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${coin.price}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--accent-rose-bg)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-rose)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Margin Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Margin (USDT)</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Free: <strong className="font-mono" style={{ color: 'var(--accent-green)' }}>${wallet?.freeMargin || 0}</strong>
              </span>
            </div>
            <input
              type="number"
              min="10"
              max={wallet?.freeMargin || 10000}
              value={margin}
              onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Leverage Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Leverage</span>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>1x (Spot)</span>
              <span>5x</span>
              <span>10x</span>
              <span>20x</span>
            </div>
          </div>

          {/* Stop Loss & Take Profit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--accent-rose)', marginBottom: '5px' }}>
                <Shield size={14} /> Stop Loss ($)
              </label>
              <input
                type="number"
                step="any"
                value={customSL}
                onChange={(e) => setCustomSL(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--accent-green)', marginBottom: '5px' }}>
                <Target size={14} /> Take Profit ($)
              </label>
              <input
                type="number"
                step="any"
                value={customTP}
                onChange={(e) => setCustomTP(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Summary Box */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Notional Position Size:</span>
              <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>${notional.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Est. Liquidation Price:</span>
              <strong className="font-mono" style={{ color: liqPrice > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                {liqPrice > 0 ? `$${liqPrice}` : 'None'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Estimated Entry Fee:</span>
              <strong className="font-mono" style={{ color: 'var(--text-muted)' }}>
                ${(notional * 0.0005).toFixed(3)}
              </strong>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleConfirm}
            className="btn"
            style={{
              padding: '12px',
              backgroundColor: 'var(--accent-green)',
              color: '#000',
              fontWeight: 700,
              fontSize: '14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>Confirm Paper Long</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
