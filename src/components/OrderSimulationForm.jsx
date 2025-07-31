import { useState, useEffect } from "react";
import { useOrderbookStore } from "@/store/orderbookStore";
import { VENUE_SYMBOLS, getSymbolsForVenue, getDefaultSymbolForVenue } from "@/config/symbols";
import { simulateOrder, getMidPrice, getSpreadBps } from "@/utils/orderSimulation";
import {
  Paper,
  Title,
  Select,
  NumberInput,
  Button,
  Group,
  Stack,
  Alert,
  Badge,
  Text,
  Grid,
  Divider,
  ActionIcon,
  Tooltip,
  Card,
  Flex,
  Box
} from '@mantine/core';
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconClock, 
  IconAlertTriangle,
  IconChartLine,
  IconInfoCircle,
  IconRefresh
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const DELAYS = [
  { label: "Immediate", value: "0", icon: "⚡" },
  { label: "5 seconds", value: "5", icon: "⏱️" },
  { label: "10 seconds", value: "10", icon: "⏰" },
  { label: "30 seconds", value: "30", icon: "🕐" },
];

export default function OrderSimulationForm({ currentVenue = "okx" }) {
  const orderbooks = useOrderbookStore((s) => s.orderbooks);
  const setSimulatedOrder = useOrderbookStore((s) => s.setSimulatedOrder);
  const setSimResult = useOrderbookStore((s) => s.setSimResult);
  const setShowSimulationLine = useOrderbookStore((s) => s.setShowSimulationLine);
  const clearSimulation = useOrderbookStore((s) => s.clearSimulation);
  
  const [formData, setFormData] = useState({
      venue: currentVenue,
      symbol: "BTC-USDT",
      orderType: "Market",
      side: "Buy",
      price: "",
      quantity: "",
    delay: "0",
  });
  
  // Sync formData.venue when currentVenue changes
  useEffect(() => {
    const defaultSymbol = getDefaultSymbolForVenue(currentVenue);
    setFormData(prev => ({ 
      ...prev, 
      venue: currentVenue,
      symbol: defaultSymbol 
    }));
  }, [currentVenue]);
  
  const [submitting, setSubmitting] = useState(false);

  const handleVenueChange = (venue) => {
    const defaultSymbol = getDefaultSymbolForVenue(venue);
    setFormData(prev => ({ 
      ...prev, 
      venue,
      symbol: defaultSymbol 
    }));
  };

  const validateForm = () => {
    const qty = Number(formData.quantity);
    if (!qty || qty <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Quantity must be greater than 0',
        color: 'red'
      });
      return false;
    }

    if (formData.orderType === "Limit" && (!formData.price || Number(formData.price) <= 0)) {
      notifications.show({
        title: 'Validation Error',
        message: 'Price must be greater than 0 for limit orders',
        color: 'red'
      });
      return false;
    }

    const ob = orderbooks[formData.venue];
    if (!ob || ob.bids.length === 0 || ob.asks.length === 0) {
      notifications.show({
        title: 'No Data',
        message: 'No orderbook data available for this venue',
        color: 'orange'
      });
      return false;
    }

    return true;
  };

  const onSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    
    const qty = Number(formData.quantity);
    const price = formData.price ? Number(formData.price) : undefined;
    const ob = orderbooks[formData.venue];

    const runSimulation = () => {
      const result = simulateOrderWrapper({
        venue: formData.venue,
        symbol: formData.symbol,
        orderType: formData.orderType,
        side: formData.side,
        price,
        quantity: qty,
        delaySec: Number(formData.delay),
        orderbook: ob,
      });

      // Set simulated order with the actual price used in simulation
      const simPrice = result.avgFillPrice || result.fillPrice || price;
      console.log('🎯 Setting Simulated Order:', { 
        venue: formData.venue, 
        price: simPrice, 
        numericPrice: Number(simPrice),
        quantity: result.filledQuantity || qty,
        orderType: formData.orderType,
        side: formData.side,
        status: result.status
      });
      
      if (simPrice) {
        setSimulatedOrder({ 
          venue: formData.venue, 
          price: Number(simPrice), 
          quantity: result.filledQuantity || qty, 
          orderType: formData.orderType,
          side: formData.side,
          status: result.status
        });
      }

      // Map new result format to legacy UI format for compatibility
      const finalResult = {
        type: result.type,
        price: result.fillPrice || price,
        avgFillPrice: result.avgFillPrice,
        filledQuantity: result.filledQuantity,
        filledPct: result.filledPct,
        slippageBps: result.slippageBps || 0,
        impactBps: result.impactBps || 0,
        remainingQty: result.remainingQuantity || 0,
        // For limit orders
        crosses: result.status === 'filled' || result.status === 'partial',
        queueAheadQty: result.orderPosition?.sizeAhead || 0,
        // Additional new fields
        status: result.status,
        fills: result.fills || [],
        estimatedTimeToFill: result.estimatedTimeToFill
      };


      setSimResult(finalResult);
      setShowSimulationLine(true); // Enable persistent simulation line
      setSubmitting(false);
      
      // Show appropriate notification based on result
      const getNotificationMessage = () => {
        switch (result.status) {
          case 'filled':
            return `${formData.side} ${formData.orderType} order filled completely at $${result.avgFillPrice?.toFixed(2)}`;
          case 'partial':
            return `${formData.side} ${formData.orderType} order partially filled: ${(result.filledPct * 100).toFixed(1)}%`;
          case 'resting':
            return `${formData.side} ${formData.orderType} order would rest in the book at $${price}`;
          case 'failed':
            return `Order simulation failed: ${result.error}`;
          default:
            return `${formData.orderType} ${formData.side} order simulated successfully`;
        }
      };
      
      notifications.show({
        title: 'Simulation Complete',
        message: getNotificationMessage(),
        color: result.status === 'failed' ? 'red' : result.status === 'filled' ? 'green' : 'blue'
      });
    };

    const delaySec = Number(formData.delay);
    if (delaySec > 0) {
      // Don't clear simulated order immediately - keep previous simulation visible
      notifications.show({
        title: 'Simulation Scheduled',
        message: `Order simulation will run in ${delaySec} seconds`,
        color: 'blue'
      });
      setTimeout(runSimulation, delaySec * 1000);
    } else {
      runSimulation();
    }
  };

  const currentSymbols = getSymbolsForVenue(formData.venue);
  const selectedSymbol = currentSymbols.find(s => s.value === formData.symbol);

  return (
    <Paper shadow="md" p="xl" radius="lg" bg="dark.8">
              <Group justify="space-between" mb="lg">
          <Title order={2} c="green.4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Order Simulation
          </Title>
          <Badge variant="light" color="green" leftSection={<IconChartLine size={14} />}>
            Live Trading Simulator
          </Badge>
        </Group>

      <Stack gap="lg">
        {/* Venue and Symbol Selection */}
        <Grid>
          <Grid.Col span={6}>
            <Select
              label="Trading Venue"
              placeholder="Select venue"
              data={[
                { value: "okx", label: "OKX" },
                { value: "bybit", label: "Bybit" },
                { value: "deribit", label: "Deribit" }
              ]}
              value={formData.venue}
              onChange={handleVenueChange}
              leftSection={<IconTrendingUp size={16} />}
              styles={{
                label: { fontWeight: 600 }
              }}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Cryptocurrency Pair"
              placeholder="Select symbol"
              data={currentSymbols.map(symbol => ({
                value: symbol.value,
                label: `${symbol.icon} ${symbol.label}`
              }))}
              value={formData.symbol}
              onChange={(value) => setFormData(prev => ({ ...prev, symbol: value }))}
              leftSection={selectedSymbol ? <Text span>{selectedSymbol.icon}</Text> : <IconChartLine size={16} />}
              styles={{
                label: { fontWeight: 600 }
              }}
            />
          </Grid.Col>
        </Grid>

        <Divider />

        {/* Order Type and Side */}
        <Grid>
          <Grid.Col span={6}>
            <Select
              label="Order Type"
              data={[
                { value: "Market", label: "Market Order" },
                { value: "Limit", label: "Limit Order" }
              ]}
              value={formData.orderType}
              onChange={(value) => setFormData(prev => ({ ...prev, orderType: value }))}
              leftSection={<IconChartLine size={16} />}
              styles={{
                label: { fontWeight: 600 }
              }}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Order Side"
              data={[
                { 
                  value: "Buy", 
                  label: "Buy Order",
                },
                { 
                  value: "Sell", 
                  label: "Sell Order"
                }
              ]}
              value={formData.side}
              onChange={(value) => setFormData(prev => ({ ...prev, side: value }))}
              leftSection={formData.side === "Buy" ? <IconTrendingUp size={16} color="green" /> : <IconTrendingDown size={16} color="red" />}
              styles={{
                label: { fontWeight: 600 }
              }}
            />
          </Grid.Col>
        </Grid>

        {/* Price and Quantity */}
        <Grid>
          {formData.orderType === "Limit" && (
            <Grid.Col span={6}>
              <NumberInput
                label="Limit Price"
                placeholder="Enter price"
                value={formData.price}
                onChange={(value) => setFormData(prev => ({ ...prev, price: value.toString() }))}
                min={0}
                step={0.01}
                decimalScale={8}
                leftSection="$"
                styles={{
                  label: { fontWeight: 600 }
                }}
              />
            </Grid.Col>
          )}
          <Grid.Col span={formData.orderType === "Limit" ? 6 : 12}>
            <NumberInput
              label="Quantity"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(value) => setFormData(prev => ({ ...prev, quantity: value.toString() }))}
              min={0}
              step={0.0001}
              decimalScale={8}
              styles={{
                label: { fontWeight: 600 }
              }}
            />
          </Grid.Col>
        </Grid>

        {/* Timing Delay */}
        <Select
          label="Execution Timing"
          placeholder="Select delay"
          data={DELAYS.map(delay => ({
            value: delay.value,
            label: `${delay.icon} ${delay.label}`
          }))}
          value={formData.delay}
          onChange={(value) => setFormData(prev => ({ ...prev, delay: value }))}
          leftSection={<IconClock size={16} />}
          styles={{
            label: { fontWeight: 600 }
          }}
        />

        {/* Market Data Status */}
        {orderbooks[formData.venue] && (orderbooks[formData.venue].bids.length === 0 || orderbooks[formData.venue].asks.length === 0) && (
          <Alert color="orange" title="No Market Data" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">
              Waiting for orderbook data from {formData.venue.toUpperCase()}. 
              Please wait for connection to establish or try switching venues.
            </Text>
          </Alert>
        )}



        {/* Submit Button */}
        <Group gap="sm">
          <Button
            onClick={onSubmit}
            loading={submitting}
            size="lg"
            radius="md"
            variant="filled"
            color="green"
            leftSection={<IconChartLine size={20} />}
            style={{ flex: 1 }}
            disabled={!orderbooks[formData.venue] || orderbooks[formData.venue].bids.length === 0 || orderbooks[formData.venue].asks.length === 0}
          >
            {submitting ? 'Simulating Order...' : 'Simulate Order'}
          </Button>
          <Button
            onClick={clearSimulation}
            size="lg"
            radius="md"
            variant="outline"
            color="gray"
            leftSection={<IconRefresh size={20} />}
            disabled={submitting}
          >
            Clear
          </Button>
        </Group>

        {/* Current Market Info */}
        {formData.venue && 
         orderbooks[formData.venue] && 
         orderbooks[formData.venue].bids && 
         orderbooks[formData.venue].asks &&
         orderbooks[formData.venue].bids.length > 0 && 
         orderbooks[formData.venue].asks.length > 0 && (
          <Card withBorder p="md" radius="md" bg="dark.8">
            <Text size="sm" fw={600} mb="xs" c="white">Current Market Data</Text>
            <Flex justify="space-between">
              <Box>
                <Text size="xs" c="gray.4">Best Bid</Text>
                <Text size="sm" fw={500} c="green.4">
                  ${parseFloat(orderbooks[formData.venue].bids[0][0]).toLocaleString()}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="gray.4">Best Ask</Text>
                <Text size="sm" fw={500} c="red.4">
                  ${parseFloat(orderbooks[formData.venue].asks[0][0]).toLocaleString()}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="gray.4">Spread</Text>
                <Text size="sm" fw={500} c="white">
                  ${(parseFloat(orderbooks[formData.venue].asks[0][0]) - parseFloat(orderbooks[formData.venue].bids[0][0])).toFixed(2)}
                </Text>
              </Box>
            </Flex>
          </Card>
        )}
      </Stack>

      <SimResultPreview />
    </Paper>
  );
}

/* --- Simulation Core - Now using robust engine --- */
function simulateOrderWrapper({ venue, symbol, orderType, side, price, quantity, delaySec, orderbook }) {
  // Use the new robust simulation engine from utils
  return simulateOrder(orderbook, orderType, side, price, quantity);
}

/**
 * SimResultPreview Component
 *
 * This component displays the results of a market or limit order simulation.
 * It retrieves simulation results from the Zustand store and renders them
 * in a structured and readable format, including warnings for high slippage or low fill rates.
 */
function SimResultPreview() {
  const { simResult } = useOrderbookStore();

  // Do not render if there are no simulation results yet
  if (!simResult) {
    return null;
  }

  // Determine warning levels
  const getSlippageWarning = (slippageBps) => {
    const absSlippage = Math.abs(slippageBps);
    if (absSlippage > 100) return { level: 'high', message: 'High slippage warning! This order may cause significant market impact.' };
    if (absSlippage > 50) return { level: 'medium', message: 'Moderate slippage detected. Consider reducing order size.' };
    if (absSlippage > 20) return { level: 'low', message: 'Minor slippage expected.' };
    return null;
  };

  const getFillWarning = (filledPct) => {
    if (filledPct < 0.5) return { level: 'high', message: 'Warning: Order may only be partially filled (< 50%)' };
    if (filledPct < 0.8) return { level: 'medium', message: 'Caution: Order may not be fully filled' };
    return null;
  };

  const slippageWarning = getSlippageWarning(simResult.slippageBps);
  const fillWarning = simResult.type === "market" ? getFillWarning(simResult.filledPct) : null;

  return (
    <Stack gap="md" mt="xl">
      {/* Warnings Section */}
      {(slippageWarning || fillWarning) && (
        <Stack gap="xs">
          {slippageWarning && (
            <Alert 
              icon={<IconAlertTriangle size={16} />} 
              title="Slippage Alert" 
              color={slippageWarning.level === 'high' ? 'red' : slippageWarning.level === 'medium' ? 'yellow' : 'blue'}
              variant="light"
            >
              {slippageWarning.message}
            </Alert>
          )}
          
          {fillWarning && (
            <Alert 
              icon={<IconInfoCircle size={16} />} 
              title="Fill Warning" 
              color={fillWarning.level === 'high' ? 'red' : 'yellow'}
              variant="light"
            >
              {fillWarning.message}
            </Alert>
          )}
        </Stack>
      )}

      {/* Results Section */}
      {simResult && (
        <Paper withBorder p="lg" radius="md" bg="dark.8">
          <Group justify="space-between" mb="md">
            <Title order={4} c="green.4">📊 Simulation Results</Title>
            <Badge variant="dot" color="green">
              {simResult.type} order
            </Badge>
          </Group>
          
          {simResult.type === "market" ? (
            <Grid>
              <Grid.Col span={6}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Filled Quantity:</Text>
                    <Text size="sm" fw={500}>{simResult.filledQuantity.toFixed(6)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Fill Percentage:</Text>
                    <Badge color={simResult.filledPct < 0.8 ? 'yellow' : 'green'} variant="light">
                      {(simResult.filledPct * 100).toFixed(2)}%
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Avg Fill Price:</Text>
                    <Text size="sm" fw={500}>${simResult.avgFillPrice.toFixed(2)}</Text>
                  </Group>
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Slippage:</Text>
                    <Badge color={Math.abs(simResult.slippageBps) > 50 ? 'red' : Math.abs(simResult.slippageBps) > 20 ? 'yellow' : 'green'} variant="light">
                      {simResult.slippageBps.toFixed(2)} bps
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Market Impact:</Text>
                    <Badge color={Math.abs(simResult.impactBps) > 50 ? 'red' : Math.abs(simResult.impactBps) > 20 ? 'yellow' : 'green'} variant="light">
                      {simResult.impactBps.toFixed(2)} bps
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Unfilled Qty:</Text>
                    <Text size="sm" fw={500}>{simResult.remainingQty.toFixed(6)}</Text>
                  </Group>
                </Stack>
              </Grid.Col>
            </Grid>
          ) : (
            <Grid>
              <Grid.Col span={6}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Limit Price:</Text>
                    <Text size="sm" fw={500}>${simResult.price}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Crosses Book:</Text>
                    <Badge color={simResult.crosses ? 'green' : 'yellow'} variant="light">
                      {simResult.crosses ? "Yes" : "No"}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Queue Ahead:</Text>
                    <Text size="sm" fw={500}>{simResult.queueAheadQty?.toFixed(6) || 'N/A'}</Text>
                  </Group>
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Slippage vs Mid:</Text>
                    <Badge color={Math.abs(simResult.slippageBps || 0) > 50 ? 'red' : Math.abs(simResult.slippageBps || 0) > 20 ? 'yellow' : 'green'} variant="light">
                      {(simResult.slippageBps || 0).toFixed(2)} bps
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Impact vs Mid:</Text>
                    <Badge color={Math.abs(simResult.impactBps || 0) > 50 ? 'red' : Math.abs(simResult.impactBps || 0) > 20 ? 'yellow' : 'green'} variant="light">
                      {(simResult.impactBps || 0).toFixed(2)} bps
                    </Badge>
                  </Group>
                </Stack>
              </Grid.Col>
            </Grid>
          )}
        </Paper>
      )}
    </Stack>
  );
}
