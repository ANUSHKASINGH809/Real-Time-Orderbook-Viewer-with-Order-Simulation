// pages/index.js
import * as BybitModule from "@/services/bybit";
console.log("BybitModule:", BybitModule);

// pages/index.js
import { useEffect, useRef, useState } from "react";
import { connectOKX } from "@/services/okx";
import { connectBybit } from "@/services/bybit";
import { connectDeribit } from "@/services/deribit";
import { useOrderbookStore } from "@/store/orderbookStore";
import OrderBookTable from "@/components/OrderBookTable";
import OrderSimulationForm from "@/components/OrderSimulationForm";
import MarketDepthChart from "@/components/MarketDepthChart";
import OrderImpactMetrics from "@/components/OrderImpactMetrics";
import TimingComparison from "@/components/TimingComparison";
import ConnectionStatus from "@/components/ConnectionStatus";
import { 
  Container, 
  Title, 
  Paper, 
  Group, 
  Select, 
  Badge, 
  Stack, 
  Grid,
  Box,
  Text
} from '@mantine/core';
import { IconChartLine, IconDatabase } from '@tabler/icons-react';

export default function Home() {
  const { updateOrderBook, setConnectionStatus, setError, clearError, setSimulatedOrder } = useOrderbookStore();
  const [venue, setVenue] = useState("okx");
  const connRef = useRef(null);

  useEffect(() => {
    // cleanup any previous connection
    connRef.current?.close?.();
    
    // Clear simulated order when venue changes
    setSimulatedOrder(null);

    const connectWithErrorHandling = (connectFn, venueName, symbol) => {
      setConnectionStatus(venueName, 'connecting');
      clearError(venueName);
      
      try {
        const connection = connectFn(symbol, updateOrderBook, {
          onOpen: () => {
            setConnectionStatus(venueName, 'connected');
            clearError(venueName);
          },
          onError: (error) => {
            setConnectionStatus(venueName, 'error');
            setError(venueName, error.message || 'Connection error');
          },
          onClose: () => {
            setConnectionStatus(venueName, 'disconnected');
          }
        });
        return connection;
      } catch (error) {
        setConnectionStatus(venueName, 'error');
        setError(venueName, error.message);
        return null;
      }
    };

    let c;
    if (venue === "okx") {
      c = connectWithErrorHandling(connectOKX, "okx", "BTC-USDT");
    } else if (venue === "bybit") {
      console.log("Switching to Bybit...");
      c = connectWithErrorHandling((symbol, updateFn, callbacks) => 
        connectBybit(symbol, updateFn, "linear", callbacks), "bybit", "BTC-USDT");
    } else if (venue === "deribit") {
      c = connectWithErrorHandling(connectDeribit, "deribit", "BTC-USD");
    }

    connRef.current = c;

    return () => {
      if (c?.close) {
        c.close();
        setConnectionStatus(venue, 'disconnected');
      }
    };
    // only re-run when venue changes
  }, [venue, updateOrderBook, setConnectionStatus, setError, clearError, setSimulatedOrder]);

  return (
    <Box bg="dark.9" mih="100vh" p="md">
      <Container size="xl">
        <Stack gap="xl">
          {/* Header */}
          <Paper shadow="md" p="xl" radius="lg">
            <Group justify="space-between" align="center" mb="md">
              <Box>
                <Title order={1} size="h2" c="green" mb="xs">
                  🚀 Real-Time Orderbook Viewer & Order Simulation
                </Title>
                <Text c="dimmed" size="lg">
                  Professional crypto trading simulator with live market data
                </Text>
              </Box>
              <Badge 
                variant="light"
                color="green"
                size="lg"
                leftSection={<IconChartLine size={16} />}
              >
                Live Trading Platform
              </Badge>
            </Group>
            
            <Group>
              <Text fw={700} c="gray.1">Current Venue:</Text>
              <Select
                data={[
                  { value: "okx", label: "🏛️ OKX Exchange" },
                  { value: "bybit", label: "⚡ Bybit" },
                  { value: "deribit", label: "💎 Deribit" }
                ]}
                value={venue}
                onChange={setVenue}
                leftSection={<IconDatabase size={16} />}
                w={200}
                variant="filled"
              />
            </Group>
          </Paper>

          {/* Main Content Grid */}
          <Grid>
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Stack gap="xl">
                <OrderSimulationForm currentVenue={venue} />
                <OrderImpactMetrics venue={venue} />
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Stack gap="xl">
                <OrderBookTable venue={venue} />
                <MarketDepthChart venue={venue} />
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Connection Status */}
          <ConnectionStatus />
          
          {/* Timing Comparison - Full Width */}
          <TimingComparison currentVenue={venue} />
        </Stack>
      </Container>
    </Box>
  );
}
