/**
 * Robust Order Simulation Engine
 * 
 * Based on real trading exchange algorithms:
 * - Price-Time Priority (FIFO) matching
 * - Proper market impact calculation
 * - Realistic order execution simulation
 * - Slippage and liquidity modeling
 */

/**
 * Calculate the mid price from the orderbook
 */
export function getMidPrice(orderbook) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return null;
  
  const bestBid = parseFloat(orderbook.bids[0][0]);
  const bestAsk = parseFloat(orderbook.asks[0][0]);
  
  return (bestBid + bestAsk) / 2;
}

/**
 * Calculate the spread in basis points
 */
export function getSpreadBps(orderbook) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) return null;
  
  const bestBid = parseFloat(orderbook.bids[0][0]);
  const bestAsk = parseFloat(orderbook.asks[0][0]);
  const mid = getMidPrice(orderbook);
  
  return ((bestAsk - bestBid) / mid) * 10000; // Convert to basis points
}

/**
 * Simulate Market Order Execution using Price-Time Priority (FIFO)
 * 
 * @param {Object} orderbook - Current orderbook state
 * @param {string} side - 'Buy' or 'Sell'
 * @param {number} quantity - Order quantity
 * @returns {Object} Simulation result
 */
export function simulateMarketOrder(orderbook, side, quantity) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) {
    return {
      type: 'market',
      side,
      quantity,
      status: 'failed',
      error: 'No liquidity available',
      fillPrice: null,
      avgFillPrice: null,
      filledQuantity: 0,
      filledPct: 0,
      remainingQuantity: quantity,
      slippageBps: null,
      impactBps: null,
      estimatedTimeToFill: null,
      fills: []
    };
  }

  const mid = getMidPrice(orderbook);
  const targetBook = side === 'Buy' ? orderbook.asks : orderbook.bids;
  
  let remainingQty = quantity;
  let totalCost = 0;
  let fills = [];
  
  // Process orders using FIFO (Price-Time Priority)
  for (let i = 0; i < targetBook.length && remainingQty > 0; i++) {
    const [price, size] = targetBook[i];
    const levelPrice = parseFloat(price);
    const levelSize = parseFloat(size);
    
    // Calculate how much we can fill at this level
    const fillQty = Math.min(remainingQty, levelSize);
    const fillCost = fillQty * levelPrice;
    
    fills.push({
      price: levelPrice,
      quantity: fillQty,
      cost: fillCost,
      level: i + 1
    });
    
    totalCost += fillCost;
    remainingQty -= fillQty;
  }
  
  const filledQuantity = quantity - remainingQty;
  const filledPct = filledQuantity / quantity;
  const avgFillPrice = filledQuantity > 0 ? totalCost / filledQuantity : null;
  
  // Calculate slippage and market impact
  let slippageBps = null;
  let impactBps = null;
  
  if (avgFillPrice && mid) {
    const expectedDirection = side === 'Buy' ? 1 : -1;
    const slippage = (avgFillPrice - mid) * expectedDirection;
    slippageBps = (slippage / mid) * 10000;
    
    // Market impact is similar but represents the cost of immediacy
    impactBps = Math.abs(slippageBps);
  }
  
  // Estimate time to fill (immediate for market orders that fill)
  const estimatedTimeToFill = filledQuantity > 0 ? 0 : null;
  
  return {
    type: 'market',
    side,
    quantity,
    status: filledQuantity > 0 ? (remainingQty > 0 ? 'partial' : 'filled') : 'failed',
    fillPrice: avgFillPrice,
    avgFillPrice,
    filledQuantity,
    filledPct,
    remainingQuantity: remainingQty,
    slippageBps,
    impactBps,
    estimatedTimeToFill,
    fills,
    // Additional metrics
    worstFillPrice: fills.length > 0 ? fills[fills.length - 1].price : null,
    bestFillPrice: fills.length > 0 ? fills[0].price : null,
    levelsConsumed: fills.length,
    totalCost
  };
}

/**
 * Simulate Limit Order Placement
 * 
 * @param {Object} orderbook - Current orderbook state
 * @param {string} side - 'Buy' or 'Sell'
 * @param {number} price - Limit price
 * @param {number} quantity - Order quantity
 * @returns {Object} Simulation result
 */
export function simulateLimitOrder(orderbook, side, price, quantity) {
  if (!orderbook?.bids?.length || !orderbook?.asks?.length) {
    return {
      type: 'limit',
      side,
      price,
      quantity,
      status: 'failed',
      error: 'No market data available',
      fillPrice: price,
      avgFillPrice: price,
      filledQuantity: 0,
      filledPct: 0,
      remainingQuantity: quantity,
      slippageBps: null,
      impactBps: null,
      estimatedTimeToFill: null,
      orderPosition: null
    };
  }

  const mid = getMidPrice(orderbook);
  const bestBid = parseFloat(orderbook.bids[0][0]);
  const bestAsk = parseFloat(orderbook.asks[0][0]);
  
  // Determine if this is an aggressive or passive order
  const isAggressive = (side === 'Buy' && price >= bestAsk) || 
                      (side === 'Sell' && price <= bestBid);
  
  if (isAggressive) {
    // Treat as market order with limit price protection
    return simulateAggressiveLimitOrder(orderbook, side, price, quantity, mid);
  } else {
    // Passive limit order - will rest in the book
    return simulatePassiveLimitOrder(orderbook, side, price, quantity, mid);
  }
}

/**
 * Simulate Aggressive Limit Order (crosses the spread)
 */
function simulateAggressiveLimitOrder(orderbook, side, price, quantity, mid) {
  const targetBook = side === 'Buy' ? orderbook.asks : orderbook.bids;
  
  let remainingQty = quantity;
  let totalCost = 0;
  let fills = [];
  
  // Process orders up to our limit price
  for (let i = 0; i < targetBook.length && remainingQty > 0; i++) {
    const [levelPriceStr, levelSizeStr] = targetBook[i];
    const levelPrice = parseFloat(levelPriceStr);
    const levelSize = parseFloat(levelSizeStr);
    
    // Check if we can trade at this level given our limit price
    const canTrade = side === 'Buy' ? levelPrice <= price : levelPrice >= price;
    
    if (!canTrade) break;
    
    const fillQty = Math.min(remainingQty, levelSize);
    const fillCost = fillQty * levelPrice;
    
    fills.push({
      price: levelPrice,
      quantity: fillQty,
      cost: fillCost,
      level: i + 1
    });
    
    totalCost += fillCost;
    remainingQty -= fillQty;
  }
  
  const filledQuantity = quantity - remainingQty;
  const filledPct = filledQuantity / quantity;
  const avgFillPrice = filledQuantity > 0 ? totalCost / filledQuantity : price;
  
  // Calculate metrics
  let slippageBps = null;
  let impactBps = null;
  
  if (mid && filledQuantity > 0) {
    const expectedDirection = side === 'Buy' ? 1 : -1;
    const slippage = (avgFillPrice - mid) * expectedDirection;
    slippageBps = (slippage / mid) * 10000;
    impactBps = Math.abs(slippageBps);
  }
  
  return {
    type: 'limit',
    side,
    price,
    quantity,
    status: filledQuantity > 0 ? (remainingQty > 0 ? 'partial' : 'filled') : 'resting',
    fillPrice: avgFillPrice,
    avgFillPrice,
    filledQuantity,
    filledPct,
    remainingQuantity: remainingQty,
    slippageBps,
    impactBps,
    estimatedTimeToFill: filledQuantity > 0 ? 0 : null,
    fills,
    orderPosition: remainingQty > 0 ? calculateOrderPosition(orderbook, side, price) : null
  };
}

/**
 * Simulate Passive Limit Order (rests in the book)
 */
function simulatePassiveLimitOrder(orderbook, side, price, quantity, mid) {
  // Calculate order position in the queue
  const orderPosition = calculateOrderPosition(orderbook, side, price);
  
  // Estimate time to fill based on recent trading activity
  const estimatedTimeToFill = estimateTimeToFill(orderbook, side, price, quantity);
  
  // Calculate slippage vs mid price
  let slippageBps = null;
  let impactBps = null;
  
  if (mid) {
    const expectedDirection = side === 'Buy' ? 1 : -1;
    const slippage = (price - mid) * expectedDirection;
    slippageBps = (slippage / mid) * 10000;
    impactBps = Math.abs(slippageBps);
  }
  
  return {
    type: 'limit',
    side,
    price,
    quantity,
    status: 'resting',
    fillPrice: price,
    avgFillPrice: price,
    filledQuantity: 0,
    filledPct: 0,
    remainingQuantity: quantity,
    slippageBps,
    impactBps,
    estimatedTimeToFill,
    fills: [],
    orderPosition,
    // Additional passive order metrics
    distanceFromMid: Math.abs(price - mid),
    distanceFromTouch: calculateDistanceFromTouch(orderbook, side, price),
    priceImprovement: calculatePriceImprovement(orderbook, side, price)
  };
}

/**
 * Calculate order position in the queue
 */
function calculateOrderPosition(orderbook, side, price) {
  const targetBook = side === 'Buy' ? orderbook.bids : orderbook.asks;
  
  let position = 0;
  let totalSizeAhead = 0;
  
  for (const [levelPrice, levelSize] of targetBook) {
    const levelPriceNum = parseFloat(levelPrice);
    const levelSizeNum = parseFloat(levelSize);
    
    // Check if this level has better priority
    const betterPrice = side === 'Buy' ? levelPriceNum > price : levelPriceNum < price;
    const samePrice = Math.abs(levelPriceNum - price) < 0.01; // Price tolerance
    
    if (betterPrice) {
      position++;
      totalSizeAhead += levelSizeNum;
    } else if (samePrice) {
      // Same price level - we'd be at the back of the queue
      totalSizeAhead += levelSizeNum;
      break;
    } else {
      // Worse price - we'd be ahead of this level
      break;
    }
  }
  
  return {
    level: position + 1,
    sizeAhead: totalSizeAhead,
    wouldCreateNewLevel: !targetBook.some(([p]) => Math.abs(parseFloat(p) - price) < 0.01)
  };
}

/**
 * Estimate time to fill based on recent trading velocity
 */
function estimateTimeToFill(orderbook, side, price, quantity) {
  // Simple heuristic: assume 10% of visible liquidity trades per minute
  const targetBook = side === 'Buy' ? orderbook.asks : orderbook.bids;
  
  let liquidityAhead = 0;
  
  for (const [levelPrice, levelSize] of targetBook) {
    const levelPriceNum = parseFloat(levelPrice);
    const betterPrice = side === 'Buy' ? levelPriceNum <= price : levelPriceNum >= price;
    
    if (betterPrice) {
      liquidityAhead += parseFloat(levelSize);
    } else {
      break;
    }
  }
  
  // Assume 10% turnover per minute
  const turnoverRate = 0.1 / 60; // per second
  const estimatedSeconds = liquidityAhead * turnoverRate;
  
  return Math.max(1, Math.round(estimatedSeconds)); // At least 1 second
}

/**
 * Calculate distance from best bid/ask
 */
function calculateDistanceFromTouch(orderbook, side, price) {
  const touch = side === 'Buy' 
    ? parseFloat(orderbook.bids[0][0]) 
    : parseFloat(orderbook.asks[0][0]);
  
  return Math.abs(price - touch);
}

/**
 * Calculate price improvement vs current best
 */
function calculatePriceImprovement(orderbook, side, price) {
  const currentBest = side === 'Buy' 
    ? parseFloat(orderbook.bids[0][0]) 
    : parseFloat(orderbook.asks[0][0]);
  
  const improvement = side === 'Buy' 
    ? Math.max(0, price - currentBest)
    : Math.max(0, currentBest - price);
  
  return improvement;
}

/**
 * Main simulation function - routes to appropriate algorithm
 */
export function simulateOrder(orderbook, orderType, side, price, quantity) {
  try {
    if (orderType === 'Market') {
      return simulateMarketOrder(orderbook, side, quantity);
    } else {
      return simulateLimitOrder(orderbook, side, price, quantity);
    }
  } catch (error) {
    console.error('Order simulation error:', error);
    return {
      type: orderType.toLowerCase(),
      side,
      price: price || null,
      quantity,
      status: 'error',
      error: error.message,
      fillPrice: null,
      avgFillPrice: null,
      filledQuantity: 0,
      filledPct: 0,
      remainingQuantity: quantity,
      slippageBps: null,
      impactBps: null,
      estimatedTimeToFill: null
    };
  }
} 