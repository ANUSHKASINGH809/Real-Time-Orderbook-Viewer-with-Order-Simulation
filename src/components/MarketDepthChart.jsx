import { useMemo, useState, useEffect } from "react";
import { useOrderbookStore } from "@/store/orderbookStore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Scatter
} from "recharts";
import throttle from "lodash.throttle";
import { Paper, Group, Text, Box, Button } from '@mantine/core';

export default function MarketDepthChart({ venue }) {
  const orderbook = useOrderbookStore(
    (s) => s.orderbooks?.[venue] ?? { bids: [], asks: [] }
  );
  const simResult = useOrderbookStore((s) => s.simResult);
  const simulatedOrder = useOrderbookStore((s) => s.simulatedOrder);
  const showSimulationLine = useOrderbookStore((s) => s.showSimulationLine);

  const [chartData, setChartData] = useState([]);

  const throttledUpdate = useMemo(
    () => throttle((data) => setChartData(data), 200, { leading: true, trailing: true }),
    []
  );

  // Calculate mid market price
  const midMarketPrice = useMemo(() => {
    const bids = orderbook.bids || [];
    const asks = orderbook.asks || [];
    if (bids.length > 0 && asks.length > 0) {
      const bestBid = parseFloat(bids[0][0]);
      const bestAsk = parseFloat(asks[0][0]);
      return (bestBid + bestAsk) / 2;
    }
    return null;
  }, [orderbook]);

  useEffect(() => {
    const bids = orderbook.bids || [];
    const asks = orderbook.asks || [];
    if (bids.length === 0 && asks.length === 0) {
      const testData = [
        { price: 50000, bid: 100, ask: 0 },
        { price: 50001, bid: 200, ask: 0 },
        { price: 50002, bid: 0, ask: 150 },
        { price: 50003, bid: 0, ask: 250 }
      ];
      setChartData(testData);
      return;
    }
    let bidCum = 0;
    const bidsSorted = [...bids]
      .map(([p, q]) => ({ price: +p, qty: +q }))
      .sort((a, b) => b.price - a.price);
    const bidsCum = bidsSorted.map((bid) => {
      bidCum += bid.qty;
      return { price: bid.price, bid: bidCum, ask: 0 };
    });
    let askCum = 0;
    const asksSorted = [...asks]
      .map(([p, q]) => ({ price: +p, qty: +q }))
      .sort((a, b) => a.price - b.price);
    const asksCum = asksSorted.map((ask) => {
      askCum += ask.qty;
      return { price: ask.price, bid: 0, ask: askCum };
    });
    let finalChartData = [...bidsCum, ...asksCum].sort((a, b) => a.price - b.price);
    if (finalChartData.length > 0) {
      const minPrice = finalChartData[0].price;
      const maxPrice = finalChartData[finalChartData.length - 1].price;
      const priceRange = maxPrice - minPrice;
      const maxBidCum = bidCum;
      const maxAskCum = askCum;
      if (bidsCum.length > 0) {
        const leftBoundary = minPrice - priceRange * 0.1;
        finalChartData.unshift({ price: leftBoundary, bid: maxBidCum, ask: 0 });
      }
      if (asksCum.length > 0) {
        const rightBoundary = maxPrice + priceRange * 0.1;
        finalChartData.push({ price: rightBoundary, bid: 0, ask: maxAskCum });
      }
      finalChartData.sort((a, b) => a.price - b.price);
    }
    throttledUpdate(finalChartData);
  }, [orderbook, throttledUpdate, venue]);

  // Use simulatedOrder for persistent line, but only if it matches current venue
  const simPrice = (simulatedOrder?.venue === venue ? simulatedOrder?.price : null) || 
    (simResult 
      ? simResult.type === "market"
        ? simResult.avgFillPrice
        : simResult.price
      : null);
  const numericSimPrice = simPrice && !isNaN(Number(simPrice)) ? Number(simPrice) : null;
  const simPoint = numericSimPrice && chartData.length > 0
    ? chartData.find((d) => {
        const tolerance = Math.max(0.01, numericSimPrice * 0.0001);
        return Math.abs(d.price - numericSimPrice) <= tolerance;
      })
    : null;

  return (
  <div className="goquant-shimmer-border">
    <div className="goquant-inner-content">
      <Paper
        shadow="xl"
        p={0}
        radius="lg"
        bg="dark.7"
        style={{
          border: '1px solid var(--mantine-color-dark-4)',
          background: 'linear-gradient(145deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)',
          overflow: 'hidden'
        }}
      >
        {/* Enhanced Header */}
        <Box
          px="xl"
          py="md"
          style={{
            background: 'var(--mantine-color-dark-8)',
            borderBottom: '1px solid var(--mantine-color-dark-4)'
          }}
        >
          <Group justify="space-between">
            <Group gap="md">
              <Text size="xl" fw={700} c="green.4" style={{ letterSpacing: 1 }}>MARKET DEPTH</Text>
              <Group gap={4}>
                <Button size="sm" variant="light" color="green" radius="xl" style={{ fontWeight: 700, minWidth: 32 }}>-</Button>
                <Button size="sm" variant="light" color="green" radius="xl" style={{ fontWeight: 700, minWidth: 32 }}>+</Button>
              </Group>
            </Group>
            <Box ta="center">
              <Text size="xl" fw={700} c="gray.1">
                {midMarketPrice ? midMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : 'N/A'}
              </Text>
              <Text size="sm" c="gray.5">Mid Market Price</Text>
            </Box>
          </Group>
        </Box>
        {/* Chart Container */}
        <Box p="md" style={{ background: 'var(--mantine-color-dark-8)', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="price" 
                type="number"
                scale="linear"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
                axisLine={{ stroke: '#4B5563' }}
                tickFormatter={(value) => value.toLocaleString()}
                domain={[
                  (dataMin) => numericSimPrice ? Math.min(dataMin, numericSimPrice - 10) : dataMin,
                  (dataMax) => numericSimPrice ? Math.max(dataMax, numericSimPrice + 10) : dataMax
                ]}
              />
              <YAxis 
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#4B5563' }}
                axisLine={{ stroke: '#4B5563' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelFormatter={(value) => `Price: ${value.toLocaleString()}`}
                formatter={(value, name) => [
                  `${value.toLocaleString()} ${name === 'bid' ? 'Bids' : 'Asks'}`,
                  name === 'bid' ? 'Bids' : 'Asks'
                ]}
              />
              {midMarketPrice && (
                <ReferenceLine 
                  x={midMarketPrice} 
                  stroke="#6B7280" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  isFront={true}
                >
                  <Label
                    value="Mid"
                    position="top"
                    fill="#6B7280"
                    fontSize={10}
                    fontWeight="500"
                  />
                </ReferenceLine>
              )}
              <Area
                type="monotone"
                dataKey="bid"
                stroke="#10B981"
                fill="url(#bidGradient)"
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls={true}
              />
              <Area
                type="monotone"
                dataKey="ask"
                stroke="#EF4444"
                fill="url(#askGradient)"
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls={true}
              />
              {numericSimPrice && (
                <ReferenceLine 
                  x={numericSimPrice} 
                  stroke="#F59E0B" 
                  strokeWidth={3} 
                  strokeDasharray="8 4"
                  isFront={true}
                >
                  <Label
                    value={`Sim: ${numericSimPrice.toFixed(2)}`}
                    position="topLeft"
                    fill="#F59E0B"
                    fontSize={11}
                    fontWeight="bold"
                  />
                </ReferenceLine>
              )}
              {simPoint && (
                <Scatter data={[simPoint]} fill="#F59E0B" shape="circle" r={4} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </div>
  </div>
);
}
