import React from 'react';
import { LayoutGrid, List, Flame, Compass, Calendar, Clock, Zap, AlertTriangle } from 'lucide-react';

export function Tabs({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  counts,
}) {
  const tabItems = [
    { id: 'all', label: 'All Coins', count: counts.total },
    { id: 'fresh', label: 'Fresh Breakouts', count: counts.fresh, highlight: 'var(--accent-green)', icon: Flame },
    { id: 'coiling', label: 'Coiling / Pre-Breakout', count: counts.coiling, highlight: 'var(--accent-amber)', icon: Compass },
    { id: '1d_breakout', label: '1D Macro Breakouts', count: counts.breakout1d, highlight: 'var(--accent-green)', icon: Calendar },
    { id: '4h_breakout', label: '4H Fast Breakouts', count: counts.breakout4h, highlight: 'var(--accent-cyan)', icon: Clock },
    { id: 'volume', label: 'Volume Surge', count: counts.volume, highlight: 'var(--accent-cyan)', icon: Zap },
    { id: 'extended', label: 'Extended / High Risk', count: counts.extended, highlight: 'var(--accent-rose)', icon: AlertTriangle },
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 24px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* Tab Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        maxWidth: '100%',
      }}>
        {tabItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon && (
                <tab.icon
                  size={14}
                  style={{
                    color: tab.highlight || 'currentColor',
                    flexShrink: 0,
                  }}
                />
              )}
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: isActive
                    ? (tab.highlight ? tab.highlight : 'rgba(255, 255, 255, 0.15)')
                    : 'rgba(255, 255, 255, 0.06)',
                  color: isActive && tab.highlight ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: '700',
                  marginLeft: '4px',
                }}
                className="font-mono"
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* View Mode Switch (Table vs Cards) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '3px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}>
        <button
          onClick={() => onViewModeChange('table')}
          className="btn"
          title="Table View"
          style={{
            padding: '6px',
            backgroundColor: viewMode === 'table' ? 'var(--bg-tertiary)' : 'transparent',
            color: viewMode === 'table' ? 'var(--accent-green)' : 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <List size={16} />
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          className="btn"
          title="Grid View"
          style={{
            padding: '6px',
            backgroundColor: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'transparent',
            color: viewMode === 'grid' ? 'var(--accent-green)' : 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );
}
