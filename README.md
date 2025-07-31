# Real-Time Orderbook Viewer with Order Simulation

A professional Next.js application that displays real-time orderbook data from multiple cryptocurrency exchanges with advanced order simulation capabilities. Built for the GoQuant recruitment assignment.

## 🚀 Features

### Core Functionality
- **Multi-Venue Orderbook Display**: Real-time orderbooks from OKX, Bybit, and Deribit
- **Live Data Streaming**: WebSocket connections for real-time market data updates
- **Order Simulation**: Advanced order placement simulation with market impact analysis
- **Responsive Design**: Optimized for desktop and mobile trading scenarios

### Order Simulation Features
- **Market & Limit Orders**: Support for both order types with realistic execution simulation
- **Timing Analysis**: Compare order execution across different timing scenarios (immediate, 5s, 10s, 30s delays)
- **Impact Metrics**: Calculate slippage, market impact, and fill percentages
- **Visual Indicators**: Highlight simulated orders in the orderbook with distinct visual markers

### Advanced Analytics
- **Market Depth Charts**: Interactive depth visualization using Recharts
- **Order Book Imbalance**: Real-time imbalance indicators with bullish/bearish bias
- **Connection Status**: Comprehensive connection monitoring for all venues
- **Error Handling**: Robust error handling with automatic reconnection

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.4.4, React 19.1.0
- **UI Framework**: Mantine UI 8.2.1
- **State Management**: Zustand 5.0.6
- **Charts**: Recharts 3.1.0
- **WebSocket**: Native WebSocket API
- **Styling**: Tailwind CSS 4.0
- **Icons**: Tabler Icons React 3.34.1

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd goquant-orderbook
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔌 API Integration

### Supported Exchanges

#### OKX Exchange
- **WebSocket URL**: `wss://ws.okx.com:8443/ws/v5/public`
- **Documentation**: [OKX API Docs](https://www.okx.com/docs-v5/)
- **Rate Limits**: 20 requests per 2 seconds for public endpoints
- **Symbols**: BTC-USDT, ETH-USDT, SOL-USDT, etc.

#### Bybit Exchange
- **WebSocket URL**: `wss://stream.bybit.com/v5/public/linear`
- **Documentation**: [Bybit API Docs](https://bybit-exchange.github.io/docs/v5/intro)
- **Rate Limits**: 120 requests per minute for public endpoints
- **Symbols**: BTC-USDT, ETH-USDT, SOL-USDT, etc.

#### Deribit Exchange
- **WebSocket URL**: `wss://www.deribit.com/ws/api/v2`
- **Documentation**: [Deribit API Docs](https://docs.deribit.com/)
- **Rate Limits**: 20 requests per second for public endpoints
- **Symbols**: BTC-USD, ETH-USD, SOL-USD, etc.

### Rate Limiting Considerations

- **OKX**: Implements 25-second ping intervals with automatic reconnection
- **Bybit**: Uses 20-second ping intervals with throttled updates (100ms)
- **Deribit**: Implements 20-second ping intervals with JSON-RPC protocol

### Error Handling

The application implements comprehensive error handling:
- Automatic reconnection on connection loss
- Graceful degradation when APIs are unavailable
- User-friendly error messages
- Connection status indicators

## 🎯 Order Simulation Engine

### Market Order Simulation
- **Price-Time Priority**: Implements FIFO matching algorithm
- **Realistic Execution**: Simulates actual order book matching
- **Impact Calculation**: Calculates market impact and slippage
- **Fill Analysis**: Determines fill percentage and remaining quantity

### Limit Order Simulation
- **Aggressive Orders**: Orders that cross the spread execute immediately
- **Passive Orders**: Orders that rest in the book with queue position
- **Position Analysis**: Calculates queue position and time to fill
- **Price Improvement**: Analyzes price improvement vs current best

### Metrics Calculated
- **Fill Percentage**: Percentage of order filled
- **Average Fill Price**: Weighted average execution price
- **Slippage**: Difference from expected price in basis points
- **Market Impact**: Cost of immediacy in basis points
- **Time to Fill**: Estimated time for limit order execution

## 📊 Features in Detail

### Real-Time Orderbook Display
- Shows 15+ levels of bids and asks for each venue
- Real-time updates via WebSocket connections
- Seamless venue switching with automatic data loading
- Visual indicators for simulated orders

### Market Depth Visualization
- Interactive area charts showing cumulative order book depth
- Bid and ask areas with distinct color coding
- Simulated order position highlighted with reference lines
- Responsive design that adapts to screen size

### Order Simulation Form
- Comprehensive form with all required fields
- Real-time validation and error handling
- Market data integration for current prices
- Timing simulation controls for delayed execution

### Timing Comparison
- Side-by-side comparison of different timing scenarios
- Real-time analysis of order execution across delays
- Visual indicators for optimal timing selection
- Data stability monitoring for accurate comparisons

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── ConnectionStatus.jsx
│   ├── MarketDepthChart.jsx
│   ├── OrderBookTable.jsx
│   ├── OrderImpactMetrics.jsx
│   ├── OrderSimulationForm.jsx
│   └── TimingComparison.jsx
├── config/              # Configuration files
│   └── symbols.js       # Exchange symbol mappings
├── pages/               # Next.js pages
│   └── index.js         # Main application page
├── services/            # API integration
│   ├── okx.js          # OKX WebSocket service
│   ├── bybit.js        # Bybit WebSocket service
│   └── deribit.js      # Deribit WebSocket service
├── store/               # State management
│   └── orderbookStore.js # Zustand store
├── utils/               # Utility functions
│   ├── orderSimulation.js # Order simulation engine
│   └── websocket.js     # WebSocket utilities
└── styles/              # Global styles
    └── globals.css
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables
No environment variables required - all APIs are public endpoints.

### Assumptions Made

1. **Free API Usage**: All exchanges provide free public WebSocket endpoints
2. **Symbol Compatibility**: Standard crypto pairs are available across all venues
3. **Real-time Data**: WebSocket connections provide sufficient data for simulation
4. **Browser Compatibility**: Modern browsers with WebSocket support
5. **Network Stability**: Assumes stable internet connection for WebSocket connections

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Deploy automatically on push to main branch
3. Environment variables are not required

### Other Platforms
- **Netlify**: Compatible with Next.js static export
- **AWS Amplify**: Full Next.js support
- **Docker**: Can be containerized for custom deployment

## 📝 API Documentation References

- [OKX WebSocket API](https://www.okx.com/docs-v5/en/#websocket-api-public-channel)
- [Bybit WebSocket API](https://bybit-exchange.github.io/docs/v5/ws/connect)
- [Deribit WebSocket API](https://docs.deribit.com/#public-subscribe)

## 🤝 Contributing

This project was created for the GoQuant recruitment assignment. For questions or issues, please refer to the assignment requirements.

## 📄 License

This project is created for educational and recruitment purposes.

---

**Built with ❤️ for GoQuant Trading Platform**
