import { useOrderbookStore } from "@/store/orderbookStore";
import { Paper, Group, Text, Box, Divider } from '@mantine/core';

export default function OrderImpactMetrics({ venue }) {
  const { orderbooks, simulatedOrder } = useOrderbookStore();
  const { bids = [], asks = [] } = orderbooks[venue] || {};

  if (!simulatedOrder) return null;

  const { side, orderType, price, quantity } = simulatedOrder;

  // Calculate slippage and fill %
  const calculateMetrics = () => {
    const book = side === "Buy" ? asks : bids; // opposite side
    if (!book || book.length === 0) return { fillPct: 0, slippage: 0, marketImpact: 0 };

    let remainingQty = quantity;
    let filledQty = 0;
    let avgFillPrice = 0;

    for (let [p, q] of book) {
      const qtyAtPrice = Math.min(remainingQty, parseFloat(q));
      filledQty += qtyAtPrice;
      avgFillPrice += qtyAtPrice * parseFloat(p);
      remainingQty -= qtyAtPrice;
      if (remainingQty <= 0) break;
    }

    avgFillPrice = avgFillPrice / (filledQty || 1);
    const bestPrice = parseFloat(book[0][0]);
    const slippage = ((avgFillPrice - bestPrice) / bestPrice) * 100;

    const fillPct = (filledQty / quantity) * 100;
    return {
      fillPct: fillPct.toFixed(2),
      slippage: slippage.toFixed(2),
      marketImpact: (fillPct > 100 ? 100 : fillPct).toFixed(2),
    };
  };

  const { fillPct, slippage, marketImpact } = calculateMetrics();

  return (
    <Paper
      shadow="xl"
      p="lg"
      radius="lg"
      bg="dark.7"
      style={{
        border: '1px solid var(--mantine-color-dark-4)',
        background: 'linear-gradient(145deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)',
        marginTop: 16
      }}
    >
      <Text size="lg" fw={700} c="green.4" mb="sm" style={{ letterSpacing: 1 }}>ORDER IMPACT METRICS</Text>
      <Divider mb="md" color="dark.4" />
      <Group gap={32} mb="md" grow>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Fill %</Text>
          <Text fw={700} c="green.3" size="lg">{fillPct}%</Text>
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Slippage</Text>
          <Text fw={700} c={Math.abs(slippage) > 1 ? 'red.4' : 'yellow.4'} size="lg">{slippage}%</Text>
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Market Impact</Text>
          <Text fw={700} c="blue.3" size="lg">{marketImpact}%</Text>
        </Box>
      </Group>
      <Divider mb="sm" color="dark.4" />
      <Group gap={32} grow>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Order Type</Text>
          <Text fw={600} c="gray.1">{orderType}</Text>
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Side</Text>
          <Text fw={600} c={side === 'Buy' ? 'green.4' : 'red.4'}>{side}</Text>
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" c="gray.3">Quantity</Text>
          <Text fw={600} c="gray.1">{quantity}</Text>
        </Box>
      </Group>
    </Paper>
  );
}
