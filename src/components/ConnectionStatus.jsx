import { useOrderbookStore } from '@/store/orderbookStore';
import {
  Paper,
  Card,
  Group,
  Stack,
  Badge,
  Text,
  Divider,
  Box,
  Grid
} from '@mantine/core';

const statusIcons = {
  connecting: '⏳',
  connected: '🟢',
  disconnected: '🔴',
  error: '⚠️'
};

const statusColors = {
  connecting: { color: 'gray', variant: 'light' },
  connected: { color: 'green', variant: 'light' },
  disconnected: { color: 'gray', variant: 'light' },
  error: { color: 'red', variant: 'light' }
};

export default function ConnectionStatus() {
  const { connectionStatus, errors, orderbooks } = useOrderbookStore();

  const getLastUpdateTime = (venue) => {
    const lastUpdate = orderbooks[venue]?.lastUpdate;
    if (!lastUpdate) return 'Never';
    const now = Date.now();
    const diff = now - lastUpdate;
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
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
      <Text size="lg" fw={700} c="green.4" mb="md" style={{ letterSpacing: 1 }}>CONNECTION STATUS</Text>
      <Group grow spacing="lg" mb="md">
        {Object.entries(connectionStatus).map(([venue, status]) => (
          <Card
            key={venue}
            withBorder
            p="md"
            radius="md"
            bg="dark.6"
            style={{
              borderColor: 'var(--mantine-color-dark-4)',
              background: 'linear-gradient(145deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)',
              minWidth: 0,
              flex: 1
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={600} c="gray.1" tt="uppercase">{venue}</Text>
              <Badge
                leftSection={statusIcons[status]}
                color={statusColors[status].color}
                variant={statusColors[status].variant}
                size="md"
                style={{ textTransform: 'capitalize' }}
              >
                {status}
              </Badge>
            </Group>
            <Stack gap={2}>
              <Text size="sm" c="gray.3">Last update: {getLastUpdateTime(venue)}</Text>
              {orderbooks[venue]?.bids?.length > 0 && (
                <Text size="sm" c="gray.4">
                  Levels: {orderbooks[venue].bids.length} bids, {orderbooks[venue].asks.length} asks
                </Text>
              )}
            </Stack>
            {errors[venue] && (
              <Box mt="sm">
                <Badge color="red" variant="filled" size="sm" mb={2}>
                  Error
                </Badge>
                <Text size="xs" c="red.3">{errors[venue]}</Text>
              </Box>
            )}
          </Card>
        ))}
      </Group>
      <Divider my="lg" color="dark.4" />
      {/* Overall Health Indicator */}
      <Card
        withBorder
        p="md"
        radius="md"
        bg="dark.6"
        style={{
          borderColor: 'var(--mantine-color-dark-4)',
          background: 'linear-gradient(145deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)'
        }}
      >
        <Group>
          <Text size="sm" c="gray.3" fw={500}>Overall Status:</Text>
          {(() => {
            const statuses = Object.values(connectionStatus);
            const connectedCount = statuses.filter(s => s === 'connected').length;
            const connectingCount = statuses.filter(s => s === 'connecting').length;
            const totalVenues = statuses.length;
            if (connectedCount === totalVenues) {
              return <Badge color="green" variant="light" leftSection="🟢">All venues connected</Badge>;
            }
            if (connectingCount > 0) {
              return <Badge color="yellow" variant="light" leftSection="⏳">Connecting... ({connectingCount} venue{connectingCount > 1 ? 's' : ''})</Badge>;
            }
            if (connectedCount > 0) {
              return <Badge color="yellow" variant="light" leftSection="🟡">Partial connectivity ({connectedCount}/{totalVenues} connected)</Badge>;
            }
            return <Badge color="red" variant="light" leftSection="🔴">No active connections</Badge>;
          })()}
        </Group>
      </Card>
    </Paper>
  );
} 