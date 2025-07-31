// src/services/bybit.js
import throttle from "lodash.throttle";

const ENDPOINTS = {
  linear: "wss://stream.bybit.com/v5/public/linear",
  inverse: "wss://stream.bybit.com/v5/public/inverse",
  spot: "wss://stream.bybit.com/v5/public/spot",
};

const RECONNECT_MS = 3000;
const PING_MS = 20_000;

// Convert "BTC-USDT" -> "BTCUSDT"
const toBybitSymbol = (symbol) => symbol.replace("-", "");

// throttle to maintain consistent updates. Reduce throttling for better UX.
const makeThrottledUpdate = (updateOrderBook) =>
  throttle((venue, bids, asks) => {
    updateOrderBook(venue, bids.slice(0, 15), asks.slice(0, 15));
  }, 100, { leading: true, trailing: true });

export const connectBybit = (
  symbol = "BTC-USDT",
  updateOrderBook,
  market = "linear",
  callbacks = {}
) => {
  const wsUrl = ENDPOINTS[market] || ENDPOINTS.linear;

  let ws;
  let pingTimer;
  
  const { onOpen, onError, onClose } = callbacks;

  const throttledUpdate = makeThrottledUpdate(updateOrderBook);

  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const subscribePayload = (sym) => ({
    op: "subscribe",
    args: [`orderbook.50.${sym}`],
  });

  const connect = () => {
    console.log("Initializing Bybit WS:", wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const bybitSymbol = "BTCUSDT";
      console.log("Bybit WS Opened");
      onOpen?.();
      ws.send(JSON.stringify(subscribePayload(bybitSymbol)));

      pingTimer = setInterval(() => {
        try {
          ws.send(JSON.stringify({ op: "ping" }));
        } catch (_) {}
      }, PING_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = safeParse(event.data);
        if (!msg) return;

        if (msg.op === "pong") return;
        if (!msg.topic || !msg.topic.startsWith("orderbook")) return;

        const data = msg.data;
        if (!data) return;

        const bids = (data.b || []).map(([price, qty]) => [String(price), String(qty)]);
        const asks = (data.a || []).map(([price, qty]) => [String(price), String(qty)]);

        console.log('📊 Bybit Data Received:', { bidsLength: bids.length, asksLength: asks.length, bidsSample: bids.slice(0, 2), asksSample: asks.slice(0, 2) });
        throttledUpdate("bybit", bids, asks);
      } catch (e) {
        console.error("bybit onmessage error", e);
      }
    };

    ws.onerror = (err) => {
      console.error("Bybit ws error:", err);
      onError?.(err);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      console.warn("Bybit ws closed. Reconnecting in", RECONNECT_MS, "ms");
      onClose?.();
      setTimeout(connect, RECONNECT_MS);
    };
  };

  connect();

  return {
    close() {
      clearInterval(pingTimer);
      ws?.close();
      throttledUpdate.cancel?.();
    },
  };
};
