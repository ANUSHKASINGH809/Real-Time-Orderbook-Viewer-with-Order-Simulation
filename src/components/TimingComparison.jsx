import { useState, useMemo, useEffect, useRef } from 'react';
import { useOrderbookStore } from '@/store/orderbookStore';
import {
  Paper,
  Title,
  Button,
  Group,
  Stack,
  Grid,
  Select,
  NumberInput,
  Text,
  Badge,
  Card,
  Alert,
  Box,
  Divider
} from '@mantine/core';
import { 
  IconChartLine, 
  IconClock, 
  IconTrendingUp, 
  IconTrendingDown,
  IconInfoCircle 
} from '@tabler/icons-react';

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
      setHasStableData(false);
      if (stableDataTimerRef.current) {
        clearTimeout(stableDataTimerRef.current);
      }
    }

    return () => {
      if (stableDataTimerRef.current) {
        clearTimeout(stableDataTimerRef.current);
      }
    };
  }, [orderbooks, comparisonParams.venue]);

  // Helper function to simulate order for a specific timing scenario
  const simulateForTiming = (delaySeconds) => {
    const orderbook = lastGoodDataRef.current || orderbooks[comparisonParams.venue];
    if (!orderbook || !orderbook.bids.length || !orderbook.asks.length) {
      return null;
    }

    // For market orders, simulate immediate execution
    if (comparisonParams.orderType === 'market') {
      const levels = comparisonParams.side === 'Buy' ? orderbook.asks : orderbook.bids;
      let remainingQty = comparisonParams.quantity;
      let totalCost = 0;
      let filledQty = 0;

      for (const [price, qty] of levels) {
        const levelPrice = parseFloat(price);
        const levelQty = parseFloat(qty);
        
        if (remainingQty <= 0) break;
        
        const fillQty = Math.min(remainingQty, levelQty);
        totalCost += fillQty * levelPrice;
        filledQty += fillQty;
        remainingQty -= fillQty;
      }

      const avgPrice = filledQty > 0 ? totalCost / filledQty : 0;
      const bestPrice = parseFloat(levels[0][0]);
      const impactBps = filledQty > 0 ? Math.abs((avgPrice - bestPrice) / bestPrice) * 10000 : 0;

      return {
        type: 'market',
        side: comparisonParams.side,
        quantity: comparisonParams.quantity,
        filledQty,
        filledPct: (filledQty / comparisonParams.quantity) * 100,
        avgPrice,
        bestPrice,
        impactBps,
        slippageBps: impactBps,
        delaySeconds,
        status: filledQty > 0 ? 'filled' : 'failed'
      };
    }

    // For limit orders, show theoretical placement
    const price = comparisonParams.price || (comparisonParams.side === 'Buy' ? 
      parseFloat(orderbook.bids[0][0]) : parseFloat(orderbook.asks[0][0]));
    
    return {
      type: 'limit',
      side: comparisonParams.side,
      quantity: comparisonParams.quantity,
      price,
      impactBps: 0,
      slippageBps: 0,
      delaySeconds,
      status: 'pending'
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
    if (!result) return 'dark.4';
    if (result.type === 'market') {
      const slippage = Math.abs(result.slippageBps);
      if (slippage > 50) return 'red.9';
      if (slippage > 20) return 'yellow.9';
      return 'green.9';
    }
    return 'dark.4';
  };

  return (
    <Paper shadow="xl" p="xl" radius="lg" bg="dark.7" style={{ border: '1px solid var(--mantine-color-dark-4)' }}>
      <Group justify="space-between" align="center" mb="xl">
        <Group align="center" gap="md">
          <Title order={2} size="xl" c="green.4" fw={700} style={{ letterSpacing: '1px' }}>
            TIMING SCENARIO COMPARISON
          </Title>
          <IconClock size={24} color="var(--mantine-color-green-4)" />
          {showComparison && (
            <Badge
              variant="light"
              color={hasStableData ? "green" : "yellow"}
              size="sm"
              leftSection={
                <Box
                  w={8}
                  h={8}
                  bg={hasStableData ? "green.4" : "yellow.4"}
                  style={{ 
                    borderRadius: '50%',
                    animation: hasStableData ? 'none' : 'pulse 2s infinite'
                  }}
                />
              }
            >
              {hasStableData ? 'Data Stable' : 'Stabilizing...'}
            </Badge>
          )}
        </Group>
        <Button
          onClick={() => setShowComparison(!showComparison)}
          variant="filled"
          color="green"
          size="md"
          leftSection={<IconChartLine size={16} />}
          style={{ fontWeight: 600 }}
        >
          {showComparison ? 'Hide Scenarios' : 'Show Scenarios'}
        </Button>
      </Group>

      {/* Fixed height container to prevent UI jumping */}
      <Box style={{ minHeight: 400 }}>
        {!showComparison ? (
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <Stack align="center" gap="md">
              <Text size="4rem">📊</Text>
              <Text size="lg" c="gray.1" ta="center">
                Click "Show Scenarios" to analyze different timing strategies
              </Text>
              <Text size="sm" c="gray.5" ta="center">
                Compare order execution across different timing delays
              </Text>
            </Stack>
          </Box>
        ) : !hasStableData ? (
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <Card 
              shadow="md" 
              p="xl" 
              radius="lg" 
              bg="dark.6" 
              style={{ 
                border: '1px solid var(--mantine-color-dark-4)',
                maxWidth: 400,
                textAlign: 'center'
              }}
            >
              <Stack align="center" gap="md">
                <Text size="3rem">⏳</Text>
                <Title order={4} c="gray.1">Stabilizing Connection</Title>
                <Text size="sm" c="gray.3">
                  Waiting for stable data from {comparisonParams.venue.toUpperCase()}...
                </Text>
                <Text size="xs" c="gray.4">
                  This ensures accurate timing comparisons. Please wait a moment.
                </Text>
                <Group align="center" gap="xs">
                  <Box
                    style={{
                      width: 12,
                      height: 12,
                      border: '2px solid transparent',
                      borderTop: '2px solid var(--mantine-color-green-4)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  <Text size="xs" c="gray.4">Establishing stable connection</Text>
                </Group>
              </Stack>
            </Card>
          </Box>
        ) : (
        <Stack gap="md" style={{ height: 380, overflowY: 'auto' }}>
          {/* Comparison Parameters */}
          <Paper p="md" radius="lg" bg="dark.6" style={{ border: '1px solid var(--mantine-color-dark-4)' }}>
            <Grid>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <Select
                  label="Venue"
                  value={comparisonParams.venue}
                  onChange={(value) => setComparisonParams(prev => ({ ...prev, venue: value }))}
                  data={[
                    { value: 'okx', label: 'OKX' },
                    { value: 'bybit', label: 'Bybit' },
                    { value: 'deribit', label: 'Deribit' }
                  ]}
                  size="sm"
                  styles={{
                    label: { color: 'var(--mantine-color-gray-3)', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <Select
                  label="Order Type"
                  value={comparisonParams.orderType}
                  onChange={(value) => setComparisonParams(prev => ({ ...prev, orderType: value }))}
                  data={[
                    { value: 'market', label: 'Market' },
                    { value: 'limit', label: 'Limit' }
                  ]}
                  size="sm"
                  styles={{
                    label: { color: 'var(--mantine-color-gray-3)', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <Select
                  label="Side"
                  value={comparisonParams.side}
                  onChange={(value) => setComparisonParams(prev => ({ ...prev, side: value }))}
                  data={[
                    { value: 'Buy', label: 'Buy' },
                    { value: 'Sell', label: 'Sell' }
                  ]}
                  size="sm"
                  styles={{
                    label: { color: 'var(--mantine-color-gray-3)', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 6, md: 3 }}>
                <NumberInput
                  label="Quantity"
                  value={comparisonParams.quantity}
                  onChange={(value) => setComparisonParams(prev => ({ ...prev, quantity: value || 0 }))}
                  step={0.0001}
                  decimalScale={4}
                  size="sm"
                  styles={{
                    label: { color: 'var(--mantine-color-gray-3)', fontWeight: 500 }
                  }}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* Comparison Results */}
          <Grid>
            {comparisonResults.map((scenario) => (
              <Grid.Col key={scenario.value} span={{ base: 12, sm: 6, md: 3 }}>
                <Card 
                  shadow="sm" 
                  p="md" 
                  radius="lg" 
                  bg={getScenarioColor(scenario.result)}
                  style={{ 
                    border: `1px solid var(--mantine-color-${getScenarioColor(scenario.result).replace('.9', '.6')})`,
                    height: 180,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="sm" fw={600} c="gray.1">
                      {scenario.icon} {scenario.label}
                    </Text>
                    {scenario.result && (
                      <Badge 
                        size="xs" 
                        variant="light"
                        color={scenario.result.status === 'filled' ? 'green' : 'gray'}
                      >
                        {scenario.result.status}
                      </Badge>
                    )}
                  </Group>
                  
                  <Stack gap="xs" style={{ flex: 1 }}>
                    {scenario.result ? (
                      <>
                        {scenario.result.type === 'market' && (
                          <>
                            <Group justify="space-between">
                              <Text size="xs" c="gray.4">Fill %:</Text>
                              <Text size="xs" c="gray.1" fw={500}>
                                {scenario.result.filledPct.toFixed(1)}%
                              </Text>
                            </Group>
                            <Group justify="space-between">
                              <Text size="xs" c="gray.4">Avg Price:</Text>
                              <Text size="xs" c="gray.1" fw={500}>
                                ${scenario.result.avgPrice?.toFixed(2) || 'N/A'}
                              </Text>
                            </Group>
                            <Group justify="space-between">
                              <Text size="xs" c="gray.4">Slippage:</Text>
                              <Text 
                                size="xs" 
                                fw={500}
                                c={scenario.result.slippageBps > 20 ? 'red.4' : 'green.4'}
                              >
                                {scenario.result.slippageBps.toFixed(1)} bps
                              </Text>
                            </Group>
                          </>
                        )}
                        {scenario.result.type === 'limit' && (
                          <>
                            <Group justify="space-between">
                              <Text size="xs" c="gray.4">Price:</Text>
                              <Text size="xs" c="gray.1" fw={500}>
                                ${scenario.result.price?.toFixed(2) || 'N/A'}
                              </Text>
                            </Group>
                            <Group justify="space-between">
                              <Text size="xs" c="gray.4">Status:</Text>
                              <Text size="xs" c="yellow.4" fw={500}>
                                Pending
                              </Text>
                            </Group>
                          </>
                        )}
                      </>
                    ) : (
                      <Text size="xs" c="gray.5" ta="center">
                        No data available
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>

          {/* Summary */}
          {comparisonResults.length > 0 && (
            <Paper p="md" radius="lg" bg="dark.6" style={{ border: '1px solid var(--mantine-color-dark-4)' }}>
              <Group justify="space-between" align="center">
                <Group align="center" gap="xs">
                  <IconInfoCircle size={16} color="var(--mantine-color-blue-4)" />
                  <Text size="sm" c="blue.4" fw={500}>Timing Analysis</Text>
                </Group>
                <Text size="xs" c="gray.4">
                  Based on current market conditions for {comparisonParams.venue.toUpperCase()}
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
        )}
      </Box>
    </Paper>
  );
} 