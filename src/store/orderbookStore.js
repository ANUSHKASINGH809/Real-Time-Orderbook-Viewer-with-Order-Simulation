import { create } from "zustand";

export const useOrderbookStore = create((set) => ({
  orderbooks: {
    okx: { bids: [], asks: [] },
    bybit: { bids: [], asks: [] },
    deribit: { bids: [], asks: [] },
  },

  // Connection status tracking
  connectionStatus: {
    okx: 'disconnected', // 'connecting', 'connected', 'disconnected', 'error'
    bybit: 'disconnected',
    deribit: 'disconnected',
  },

  // Error tracking
  errors: {
    okx: null,
    bybit: null,
    deribit: null,
  },

  updateOrderBook: (venue, bids = [], asks = []) => {
    console.log(`📦 Store Update: ${venue.toUpperCase()} - Bids: ${bids.length}, Asks: ${asks.length}`);
    set((state) => ({
      orderbooks: {
        ...state.orderbooks,
        [venue]: {
          bids: bids.slice(0, 15),
          asks: asks.slice(0, 15),
          lastUpdate: Date.now(),
        },
      },
    }));
  },

  setConnectionStatus: (venue, status) =>
    set((state) => ({
      connectionStatus: {
        ...state.connectionStatus,
        [venue]: status,
      },
    })),

  setError: (venue, error) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [venue]: error,
      },
    })),

  clearError: (venue) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [venue]: null,
      },
    })),

  // ---- Simulation related state ----
  simResult: null,
  setSimResult: (res) => set({ simResult: res }),

  simulatedOrder: null,
  setSimulatedOrder: (order) => {
    console.log('🎯 STORE: setSimulatedOrder called with:', order);
    set({ simulatedOrder: order });
  },

  // Add persistent simulation line state
  showSimulationLine: false,
  setShowSimulationLine: (show) => set({ showSimulationLine: show }),
  
  clearSimulation: () => set({ 
    simResult: null, 
    simulatedOrder: null, 
    showSimulationLine: false 
  }),
}));
