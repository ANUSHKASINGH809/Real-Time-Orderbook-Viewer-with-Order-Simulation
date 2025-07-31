
  // src/services/deribit.js
// Deribit JSON-RPC WS
// Docs: https://docs.deribit.com/
// Typical instruments: BTC-PERPETUAL, ETH-PERPETUAL, etc.
const DERIBIT_URL = "wss://www.deribit.com/ws/api/v2";
const RECONNECT_MS = 3000;
const PING_MS = 20_000;

// Map "BTC-USD" -> "BTC-PERPETUAL" (simple default). Adjust as needed.
const toDeribitInstrument = (symbol) => {
  const base = symbol.split("-")[0]; // "BTC"
  return `${base}-PERPETUAL`;
};

// We’ll ask for 20 levels (>=15 requirement)
const buildChannel = (instrument) => `book.${instrument}.none.20.100ms`;

export function connectDeribit(symbol = "BTC-USD", updateOrderBook, callbacks = {}) {
  let ws;
  let pingTimer;
  let rpcId = 0;
  
  const { onOpen, onError, onClose } = callbacks;

  const instrument = toDeribitInstrument(symbol);
  const channel = buildChannel(instrument);

  const send = (obj) => {
    try {
      ws.send(JSON.stringify(obj));
    } catch (_) {}
  };

  const subscribe = () => {
    send({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "public/subscribe",
      params: { channels: [channel] },
    });
  };

  const connect = () => {
    ws = new WebSocket(DERIBIT_URL);

    ws.onopen = () => {
      console.log('🔗 Deribit WebSocket Connected, subscribing to:', symbol);
      onOpen?.();
      subscribe();

      pingTimer = setInterval(() => {
        send({ jsonrpc: "2.0", id: ++rpcId, method: "public/ping", params: {} });
      }, PING_MS);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Pong
      if (msg.result === "pong") return;

      // Subscription push
      if (msg.method === "subscription" && msg.params?.channel?.startsWith("book.")) {
        const data = msg.params.data;
        if (!data) return;

        // bids/asks are arrays of [price, amount, ...]
        const bids = (data.bids || []).map(([price, qty]) => [String(price), String(qty)]);
        const asks = (data.asks || []).map(([price, qty]) => [String(price), String(qty)]);

        console.log('📊 Deribit Data Received:', { bidsLength: bids.length, asksLength: asks.length });
        updateOrderBook("deribit", bids, asks);
      }
    };

    ws.onerror = (err) => {
      console.error("Deribit ws error:", err);
      onError?.(err);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      console.warn("Deribit ws closed. Reconnecting in", RECONNECT_MS, "ms");
      onClose?.();
      setTimeout(connect, RECONNECT_MS);
    };
  };

  connect();

  return {
    close() {
      clearInterval(pingTimer);
      ws?.close();
    },
  };
}
