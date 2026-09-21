import React, { useState, useMemo } from 'react';
import { useScanner } from './hooks/useScanner.js';
import { usePaperTrading } from './hooks/usePaperTrading.js';
import { BREAKOUT_STATUS } from './services/breakoutEngine.js';
import { Header } from './components/Header.jsx';
import { StatsBar } from './components/StatsBar.jsx';
import { Tabs } from './components/Tabs.jsx';
import { CoinTable } from './components/CoinTable.jsx';
import { CoinCard } from './components/CoinCard.jsx';
import { ChartModal } from './components/ChartModal.jsx';
import { PaperTradeModal } from './components/PaperTradeModal.jsx';
import { BacktestView } from './components/BacktestView.jsx';
import { PaperTradingView } from './components/PaperTradingView.jsx';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const {
    coins,
    isScanning,
    progress,
    stats,
    timeframe,
    setTimeframe,
    lastScanTime,
    error,
    scanNow,
  } = useScanner();

  const paperTrading = usePaperTrading(coins, isScanning);

  const [currentMode, setCurrentMode] = useState('scanner'); // 'scanner', 'backtest', 'paper'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'fresh', 'coiling', 'volume', 'extended'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [paperTradeCoin, setPaperTradeCoin] = useState(null);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === '1d_breakout' && timeframe !== '1d') {
      setTimeframe('1d');
    } else if (newTab === '4h_breakout' && timeframe !== '4h') {
      setTimeframe('4h');
    }
  };

  // Filter coins based on search and active tab
  const filteredCoins = useMemo(() => {
    return coins.filter((coin) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();
        if (!coin.symbol.includes(query) && !coin.baseAsset.includes(query)) {
          return false;
        }
      }

      // Tab filter
      if (activeTab === 'fresh') {
        return coin.status === BREAKOUT_STATUS.FRESH_BREAKOUT;
      }
      if (activeTab === 'coiling') {
        return coin.status === BREAKOUT_STATUS.COILING;
      }
      if (activeTab === '1d_breakout') {
        return coin.timeframe === '1d' && coin.status === BREAKOUT_STATUS.FRESH_BREAKOUT;
      }
      if (activeTab === '4h_breakout') {
        return coin.timeframe === '4h' && coin.status === BREAKOUT_STATUS.FRESH_BREAKOUT;
      }
      if (activeTab === 'volume') {
        return coin.isVolumeSpike;
      }
      if (activeTab === 'extended') {
        return coin.status === BREAKOUT_STATUS.EXTENDED;
      }

      return true;
    });
  }, [coins, searchQuery, activeTab]);

  const counts = {
    total: coins.length,
    fresh: stats.freshCount,
    coiling: stats.coilingCount,
    volume: stats.volumeSpikeCount,
    extended: stats.extendedCount,
    breakout1d: timeframe === '1d' ? stats.freshCount : 0,
    breakout4h: timeframe === '4h' ? stats.freshCount : 0,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Mode Switcher */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        isScanning={isScanning}
        progress={progress}
        lastScanTime={lastScanTime}
        onScanNow={scanNow}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        paperPositionCount={paperTrading.positions.length}
        paperUnrealizedPnL={paperTrading.wallet.unrealizedPnL}
      />

      {/* Main Mode 1: Scanner */}
      {currentMode === 'scanner' && (
        <>
          {/* Stats Bar */}
          <StatsBar
            stats={stats}
            isScanning={isScanning}
            progress={progress}
            activeTab={activeTab}
            onTabSelect={handleTabChange}
          />

          {/* Error Alert if any */}
          {error && (
            <div style={{
              margin: '0 24px 16px 24px',
              padding: '12px 16px',
              backgroundColor: 'var(--accent-rose-bg)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--accent-rose)',
              fontSize: '13px',
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs & View Controls */}
          <Tabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            counts={counts}
          />

          {/* Content Area */}
          <main style={{ flex: 1, marginTop: '16px' }}>
            {viewMode === 'table' ? (
              <CoinTable
                coins={filteredCoins}
                onSelectCoin={setSelectedCoin}
                onPaperTrade={setPaperTradeCoin}
              />
            ) : (
              <div style={{
                padding: '0 24px 40px 24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}>
                {filteredCoins.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-muted)',
                  }}>
                    No coins found matching this filter or scanning is still in progress.
                  </div>
                ) : (
                  filteredCoins.map((coin) => (
                    <CoinCard
                      key={coin.symbol}
                      coin={coin}
                      onSelectCoin={setSelectedCoin}
                      onPaperTrade={setPaperTradeCoin}
                    />
                  ))
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* Main Mode 2: Backtest Lab */}
      {currentMode === 'backtest' && (
        <main style={{ flex: 1, marginTop: '20px' }}>
          <BacktestView
            coins={coins}
            currentScannerTimeframe={timeframe}
          />
        </main>
      )}

      {/* Main Mode 3: Paper Trading Portfolio */}
      {currentMode === 'paper' && (
        <main style={{ flex: 1, marginTop: '20px' }}>
          <PaperTradingView
            wallet={paperTrading.wallet}
            positions={paperTrading.positions}
            history={paperTrading.history}
            botConfig={paperTrading.botConfig}
            setBotConfig={paperTrading.setBotConfig}
            onClosePosition={paperTrading.closePosition}
            onResetWallet={paperTrading.resetWallet}
            onOpenTradeModal={setPaperTradeCoin}
          />
        </main>
      )}

      {/* Quick Paper Trade Modal */}
      {paperTradeCoin && (
        <PaperTradeModal
          coin={paperTradeCoin}
          wallet={paperTrading.wallet}
          onOpenPosition={paperTrading.openPosition}
          onClose={() => setPaperTradeCoin(null)}
        />
      )}

      {/* TradingView Chart Modal */}
      {selectedCoin && (
        <ChartModal
          coin={selectedCoin}
          onClose={() => setSelectedCoin(null)}
        />
      )}
    </div>
  );
}
