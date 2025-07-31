// /components/OrderBookTable.jsx
import { useOrderbookStore } from "@/store/orderbookStore";
import { useMemo } from "react";
import { Paper, Group, Text, Box, Divider } from '@mantine/core';

export default function OrderBookTable({ venue }) {
  const { orderbooks, simulatedOrder } = useOrderbookStore();
  const { bids = [], asks = [] } = orderbooks[venue] || {};

  const highlightRow = (price) => {
    if (!simulatedOrder || simulatedOrder.venue !== venue) return false;
    const simPrice = Number(simulatedOrder.price);
    const rowPrice = Number(price);
    if (isNaN(simPrice) || isNaN(rowPrice)) return false;
    const tolerance = Math.max(0.01, simPrice * 0.0001);
    return Math.abs(simPrice - rowPrice) <= tolerance;
  };

  // Calculate order book imbalance
  const imbalanceData = useMemo(() => {
    if (bids.length === 0 || asks.length === 0) return { imbalance: 0, bias: 'neutral' };
    const bidVolume = bids.slice(0, 10).reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
    const askVolume = asks.slice(0, 10).reduce((sum, [, qty]) => sum + parseFloat(qty), 0);
    const totalVolume = bidVolume + askVolume;
    if (totalVolume === 0) return { imbalance: 0, bias: 'neutral' };
    const imbalance = ((bidVolume - askVolume) / totalVolume) * 100;
    const bias = Math.abs(imbalance) < 5 ? 'neutral' : imbalance > 0 ? 'bullish' : 'bearish';
    return { imbalance: imbalance.toFixed(1), bias, bidVolume, askVolume };
  }, [bids, asks]);

  const formatPrice = (price) => parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  const formatQuantity = (qty) => parseFloat(qty).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });

  // Color helpers
  const biasColor = {
    bullish: 'green.4',
    bearish: 'red.4',
    neutral: 'gray.3'
  };
  const biasEmoji = {
    bullish: '🐂',
    bearish: '🐻',
    neutral: '⚖️'
  };

  return (
    <Paper
      shadow="xl"
      p="xl"
      radius="lg"
      bg="dark.7"
      style={{
        border: '1px solid var(--mantine-color-dark-4)',
        background: 'linear-gradient(145deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)'
      }}
    >
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700} c="green.4" style={{ letterSpacing: 1 }}>ORDER BOOK</Text>
        {/* Imbalance Indicator */}
        <Text size="sm" c="gray.3">
          Imbalance:{' '}
          <Text span fw={700} c={biasColor[imbalanceData.bias]}>
            {imbalanceData.imbalance}% {biasEmoji[imbalanceData.bias]}
          </Text>
        </Text>
      </Group>
      <Group align="flex-start" grow mb="md">
        {/* Bids Section */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-dark-4)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)',
            flex: 1
          }}
        >
          <Box bg="green.9" px="md" py={8} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
            <Text fw={600} c="green.2" ta="center">Bids (Buy Orders)</Text>
            <Group gap={0} grow mt={4} mb={2}>
              <Text size="xs" c="green.4" ta="center">Price</Text>
              <Text size="xs" c="green.4" ta="center">Quantity</Text>
            </Group>
          </Box>
          <Box style={{ height: 320, overflowY: 'auto', background: '#000' }}>
            {Array.from({ length: 15 }, (_, index) => {
              const bidData = bids[index];
              const highlight = bidData && highlightRow(bidData[0]);
              return (
                <Group
                  key={index}
                  gap={0}
                  grow
                  px="md"
                  py={4}
                  style={{
                    borderBottom: '1px solid var(--mantine-color-dark-4)',
                    background: highlight
                      ? 'rgba(253, 224, 71, 0.18)' // yellow highlight
                      : undefined,
                    borderColor: highlight ? '#fde047' : 'var(--mantine-color-dark-4)',
                    minHeight: 32,
                    transition: 'background 0.2s',
                    cursor: bidData ? 'pointer' : 'default'
                  }}
                >
                  {bidData ? (
                    <>
                      <Text size="sm" fw={600} c="green.4" ta="right" style={{ flex: 1 }}>{formatPrice(bidData[0])}</Text>
                      <Text size="sm" c="gray.3" ta="right" style={{ flex: 1 }}>{formatQuantity(bidData[1])}</Text>
                    </>
                  ) : (
                    <>
                      <Text size="sm" c="gray.5" ta="right" style={{ flex: 1 }}>-</Text>
                      <Text size="sm" c="gray.5" ta="right" style={{ flex: 1 }}>-</Text>
                    </>
                  )}
                </Group>
              );
            })}
          </Box>
        </Box>
        {/* Asks Section */}
        <Box
          style={{
            border: '1px solid var(--mantine-color-dark-4)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)',
            flex: 1
          }}
        >
          <Box bg="red.9" px="md" py={8} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
            <Text fw={600} c="red.2" ta="center">Asks (Sell Orders)</Text>
            <Group gap={0} grow mt={4} mb={2}>
              <Text size="xs" c="red.4" ta="center">Price</Text>
              <Text size="xs" c="red.4" ta="center">Quantity</Text>
            </Group>
          </Box>
          <Box style={{ height: 320, overflowY: 'auto', background: '#000' }}>
            {Array.from({ length: 15 }, (_, index) => {
              const askData = asks[index];
              const highlight = askData && highlightRow(askData[0]);
              return (
                <Group
                  key={index}
                  gap={0}
                  grow
                  px="md"
                  py={4}
                  style={{
                    borderBottom: '1px solid var(--mantine-color-dark-4)',
                    background: highlight
                      ? 'rgba(253, 224, 71, 0.18)' // yellow highlight
                      : undefined,
                    borderColor: highlight ? '#fde047' : 'var(--mantine-color-dark-4)',
                    minHeight: 32,
                    transition: 'background 0.2s',
                    cursor: askData ? 'pointer' : 'default'
                  }}
                >
                  {askData ? (
                    <>
                      <Text size="sm" fw={600} c="red.4" ta="right" style={{ flex: 1 }}>{formatPrice(askData[0])}</Text>
                      <Text size="sm" c="gray.3" ta="right" style={{ flex: 1 }}>{formatQuantity(askData[1])}</Text>
                    </>
                  ) : (
                    <>
                      <Text size="sm" c="gray.5" ta="right" style={{ flex: 1 }}>-</Text>
                      <Text size="sm" c="gray.5" ta="right" style={{ flex: 1 }}>-</Text>
                    </>
                  )}
                </Group>
              );
            })}
          </Box>
        </Box>
      </Group>
      <Divider my="md" color="dark.4" />
      {/* Spread Information */}
      <Box
        mt="md"
        p="md"
        style={{
          background: 'var(--mantine-color-dark-8)',
          borderRadius: 12,
          border: '1px solid var(--mantine-color-dark-4)'
        }}
      >
        <Group grow>
          <Box ta="center">
            <Text size="sm" c="gray.3">Best Bid:</Text>
            <Text fw={700} c={bids.length > 0 ? 'green.4' : 'gray.5'}>
              {bids.length > 0 ? formatPrice(bids[0][0]) : '-'}
            </Text>
          </Box>
          <Box ta="center">
            <Text size="sm" c="gray.3">Spread:</Text>
            <Text fw={700} c={bids.length > 0 && asks.length > 0 ? 'gray.1' : 'gray.5'}>
              {bids.length > 0 && asks.length > 0 
                ? (parseFloat(asks[0][0]) - parseFloat(bids[0][0])).toFixed(2)
                : '-'}
            </Text>
          </Box>
          <Box ta="center">
            <Text size="sm" c="gray.3">Best Ask:</Text>
            <Text fw={700} c={asks.length > 0 ? 'red.4' : 'gray.5'}>
              {asks.length > 0 ? formatPrice(asks[0][0]) : '-'}
            </Text>
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
