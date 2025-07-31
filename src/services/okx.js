// src/services/okx.js
const OKX_URL = "wss://ws.okx.com:8443/ws/v5/public";
const PING_MS = 25_000;
const RECONNECT_MS = 3_000;

export function connectOKX(symbol = "BTC-USDT", updateOrderBook, callbacks = {}) {
  let ws;
  let pingTimer;
  
  const { onOpen, onError, onClose } = callbacks;

  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const connect = () => {
    ws = new WebSocket(OKX_URL);

    ws.onopen = () => {
      console.log('🔗 OKX WebSocket Connected, subscribing to:', symbol);
      onOpen?.();
      ws.send(
        JSON.stringify({
          op: "subscribe",
          args: [{ channel: "books5", instId: symbol }],
        })
      );

      // heartbeat
      pingTimer = setInterval(() => {
        try {
          ws.send("ping");
        } catch (_) {}
      }, PING_MS);
    };

    ws.onmessage = (event) => {
      const raw = typeof event.data === "string" ? event.data : "";

      // OKX can send a raw "pong"
      if (raw === "pong") return;

      const msg = safeParse(raw);
      if (!msg) return; // not JSON, ignore

      // Ignore acks / errors / other channels
      if (!msg.arg || msg.arg.channel !== "books5") return;
      if (!Array.isArray(msg.data) || msg.data.length === 0) return;

      const { bids = [], asks = [] } = msg.data[0] ?? {};
      console.log('📊 OKX Data Received:', { bidsLength: bids.length, asksLength: asks.length, bidsSample: bids.slice(0, 2), asksSample: asks.slice(0, 2) });
      updateOrderBook("okx", bids, asks);
    };

    ws.onerror = (err) => {
      console.error("OKX ws error:", err);
      onError?.(err);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      console.warn("OKX ws closed, reconnecting in", RECONNECT_MS, "ms");
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
