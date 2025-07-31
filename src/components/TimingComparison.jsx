import { useState, useMemo, useEffect, useRef } from 'react';
import { useOrderbookStore } from '@/store/orderbookStore';

const TIMING_SCENARIOS = [
  { label: 'Immediate', value: 0, icon: '⚡' },
  { label: '5 seconds', value: 5, icon: '⏱️' },
  { label: '10 seconds', value: 10, icon: '⏰' },
  { label: '30 seconds', value: 30, icon: '🕐' },
];

export default function TimingComparison({ currentVenue = 'okx' }) {
  const { orderbooks } = useOrderbookStore();
  // Use current venue from parent, sync with venue changes
  const [comparisonParams, setComparisonParams] = useState({
    venue: currentVenue,
    symbol: 'BTC-USDT',
    orderType: 'market',
    side: 'Buy',
    quantity: 0.1,
    price: null,
  });
  const [showComparison, setShowComparison] = useState(false);
  const [hasStableData, setHasStableData] = useState(false);
  const lastGoodDataRef = useRef(null);
  const stableDataTimerRef = useRef(null);

  // Sync venue when currentVenue changes
  useEffect(() => {
    setComparisonParams(prev => ({ ...prev, venue: currentVenue }));
    setHasStableData(false); // Reset stability when venue changes
    lastGoodDataRef.current = null;
  }, [currentVenue]);

  // Monitor data stability to prevent rapid UI switching
  useEffect(() => {
    const currentOrderbook = orderbooks[comparisonParams.venue];
    const hasData = currentOrderbook && currentOrderbook.bids.length > 0 && currentOrderbook.asks.length > 0;

    if (hasData) {
      // Store good data
      lastGoodDataRef.current = currentOrderbook;
      
      // Clear any existing timer
      if (stableDataTimerRef.current) {
        clearTimeout(stableDataTimerRef.current);
      }
      
      // Set stable data after 2 seconds of continuous data
      stableDataTimerRef.current = setTimeout(() => {
        setHasStableData(true);
      }, 2000);
    } else {
      // Data is missing, but don't immediately mark as unstable
      // Only mark unstable after 5 seconds of no data
      if (stableDataTimerRef.current) {
        clearTimeout(stableDataTimerRef.current);
      }
      
      stableDataTimerRef.current = setTimeout(() => {
        setHasStableData(false);
      }, 5000);
    }

    return () => {
      if (stableDataTimerRef.current) {
        clearTimeout(stableDataTimerRef.current);
      }
    };
  }, [orderbooks, comparisonParams.venue]);

  const simulateForTiming = (delaySec) => {
    // Use current data if available, otherwise use last good data
    const ob = orderbooks[comparisonParams.venue] || lastGoodDataRef.current;
    if (!ob || ob.bids.length === 0 || ob.asks.length === 0) return null;

    const bids = ob.bids.map(([p, q]) => ({ price: +p, qty: +q }));
    const asks = ob.asks.map(([p, q]) => ({ price: +p, qty: +q }));
    const bestBid = bids.length ? bids[0].price : 0;
    const bestAsk = asks.length ? asks[0].price : 0;
    const mid = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : 0;

    if (comparisonParams.orderType === 'market') {
      return simulateMarket({
        side: comparisonParams.side,
        quantity: comparisonParams.quantity,
        bestBid,
        bestAsk,
        mid,
        bids,
        asks,
      });
    }

    return simulateLimit({
      side: comparisonParams.side,
      price: comparisonParams.price || (comparisonParams.side === 'Buy' ? bestBid : bestAsk),
      quantity: comparisonParams.quantity,
      bestBid,
      bestAsk,
      mid,
      bids,
      asks,
    });
  };

  const simulateMarket = ({ side, quantity, bestBid, bestAsk, mid, bids, asks }) => {
    const bookSide = side === 'Buy' ? asks : bids;
    const bookSorted = side === 'Buy'
      ? [...bookSide].sort((a, b) => a.price - b.price)
      : [...bookSide].sort((a, b) => b.price - a.price);

    let remaining = quantity, cost = 0, filledQty = 0;
    for (const lvl of bookSorted) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lvl.qty);
      filledQty += take;
      cost += take * lvl.price;
      remaining -= take;
    }

    const filledPct = filledQty / quantity;
    const avgFillPrice = filledQty > 0 ? cost / filledQty : 0;
    const ref = side === 'Buy' ? bestAsk : bestBid;
    const slippageBps = ref ? ((avgFillPrice - ref) / ref) * 10000 * (side === 'Buy' ? 1 : -1) : 0;
    const impactBps = mid ? ((avgFillPrice - mid) / mid) * 10000 : 0;

    return {
      type: 'market',
      filledQty,
      filledPct,
      avgFillPrice,
      slippageBps,
      impactBps,
      remainingQty: Math.max(remaining, 0),
    };
  };

  const simulateLimit = ({ side, price, quantity, bestBid, bestAsk, mid, bids, asks }) => {
    const isBuy = side === 'Buy';
    const crosses = (isBuy && price >= bestAsk) || (!isBuy && price <= bestBid);

    if (crosses) {
      return simulateMarket({ side, quantity, bestBid, bestAsk, mid, bids, asks });
    }

    const mySide = isBuy ? [...bids].sort((a, b) => b.price - a.price) : [...asks].sort((a, b) => a.price - b.price);
    let aheadQty = 0;
    for (const lvl of mySide) {
      if (isBuy) {
        if (lvl.price > price) aheadQty += lvl.qty;
      } else {
        if (lvl.price < price) aheadQty += lvl.qty;
      }
    }

    const impactBps = mid ? ((price - mid) / mid) * 10000 * (isBuy ? 1 : -1) : 0;

    return {
      type: 'limit',
      crosses: false,
      queueAheadQty: aheadQty,
      filledPct: 0,
      price,
      impactBps,
      slippageBps: impactBps,
    };
  };

  const comparisonResults = useMemo(() => {
    if (!showComparison || !hasStableData) return [];
    return TIMING_SCENARIOS.map(scenario => ({
      ...scenario,
      result: simulateForTiming(scenario.value)
    }));
  }, [showComparison, hasStableData, comparisonParams, orderbooks]);

  const getScenarioColor = (result) => {
    if (!result) return 'bg-black border-gray-700';
    if (result.type === 'market') {
      const slippage = Math.abs(result.slippageBps);
      if (slippage > 50) return 'bg-red-900/30 border-red-600';
      if (slippage > 20) return 'bg-yellow-900/30 border-yellow-600';
      return 'bg-green-900/30 border-green-600';
    }
    return 'bg-black border-gray-700';
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-md p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-green-500">TIMING SCENARIO COMPARISON</h2>
          {showComparison && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              hasStableData 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {hasStableData ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Data Stable
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></div>
                  Stabilizing...
                </>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors border border-green-500"
        >
          {showComparison ? 'Hide' : 'Compare'} Scenarios
        </button>
      </div>

      {/* Fixed height container to prevent UI jumping */}
      <div className="min-h-[400px]">
        {!showComparison ? (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
                      <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg text-white">Click "Compare Scenarios" to analyze different timing strategies</p>
            <p className="text-sm mt-2 text-gray-400">Compare order execution across different timing delays</p>
          </div>
          </div>
        ) : !hasStableData ? (
          <div className="flex items-center justify-center h-[400px]">
                      <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-6 max-w-md text-center">
            <div className="text-3xl mb-3">⏳</div>
            <h4 className="font-semibold text-gray-300 mb-2">Stabilizing Connection</h4>
            <p className="text-sm text-gray-200 mb-4">
              Waiting for stable data from {comparisonParams.venue.toUpperCase()}...
            </p>
            <p className="text-xs text-gray-300">
              This ensures accurate timing comparisons. Please wait a moment.
            </p>
              <div className="mt-4">
                <div className="inline-flex items-center text-xs text-gray-400">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2"></div>
                  Establishing stable connection
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="space-y-4 h-[380px] overflow-y-auto">
          {/* Comparison Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black rounded-lg border border-gray-700">
            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Venue</label>
                <select
                  value={comparisonParams.venue}
                  onChange={(e) => setComparisonParams(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-white"
                >
                <option value="okx">OKX</option>
                <option value="bybit">Bybit</option>
                <option value="deribit">Deribit</option>
              </select>
            </div>
                          <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Order Type</label>
                <select
                  value={comparisonParams.orderType}
                  onChange={(e) => setComparisonParams(prev => ({ ...prev, orderType: e.target.value }))}
                  className="w-full border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-white"
                >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
                          <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Side</label>
                <select
                  value={comparisonParams.side}
                  onChange={(e) => setComparisonParams(prev => ({ ...prev, side: e.target.value }))}
                  className="w-full border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-white"
                >
                <option value="Buy">Buy</option>
                <option value="Sell">Sell</option>
              </select>
            </div>
                          <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                <input
                  type="number"
                  value={comparisonParams.quantity}
                  onChange={(e) => setComparisonParams(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  step="0.0001"
                  className="w-full border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-white"
                />
              </div>
          </div>

          {/* Comparison Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparisonResults.map((scenario) => (
              <div key={scenario.value} className={`border rounded-lg p-4 h-44 flex flex-col ${getScenarioColor(scenario.result)}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{scenario.icon} {scenario.label}</h3>
                  {scenario.result && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      scenario.result.type === 'market' ? 'bg-gray-600 text-gray-200' : 'bg-purple-900/50 text-purple-200'
                    }`}>
                      {scenario.result.type}
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {scenario.result ? (
                    <div className="space-y-2 text-sm">
                      {scenario.result.type === 'market' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Fill %:</span>
                            <span className={`font-medium ${scenario.result.filledPct < 0.8 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {(scenario.result.filledPct * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Avg Price:</span>
                            <span className="font-medium text-white">
                              {scenario.result.avgFillPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Slippage:</span>
                            <span className={`font-medium ${Math.abs(scenario.result.slippageBps) > 50 ? 'text-red-400' : Math.abs(scenario.result.slippageBps) > 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {scenario.result.slippageBps.toFixed(1)} bps
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Price:</span>
                            <span className="font-medium text-white">
                              {scenario.result.price}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Crosses:</span>
                            <span className={`font-medium ${scenario.result.crosses ? 'text-green-400' : 'text-yellow-400'}`}>
                              {scenario.result.crosses ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Queue:</span>
                            <span className="font-medium text-white">{scenario.result.queueAheadQty?.toFixed(3) || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 text-center">No orderbook data</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Best Scenario Recommendation */}
          {comparisonResults.length > 0 && comparisonResults.some(s => s.result) && (
            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-600 rounded-lg">
              <h4 className="font-semibold text-gray-300 mb-2">💡 Recommendation</h4>
              <p className="text-sm text-gray-200">
                Compare the scenarios above to choose the optimal timing for your order. 
                Consider slippage, fill percentage, and market conditions when making your decision.
              </p>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
} 