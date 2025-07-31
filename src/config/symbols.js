// Crypto symbols configuration for different venues
export const VENUE_SYMBOLS = {
  okx: [
    { value: 'BTC-USDT', label: 'Bitcoin (BTC/USDT)', icon: '₿' },
    { value: 'ETH-USDT', label: 'Ethereum (ETH/USDT)', icon: 'Ξ' },
    { value: 'SOL-USDT', label: 'Solana (SOL/USDT)', icon: '◎' },
    { value: 'ADA-USDT', label: 'Cardano (ADA/USDT)', icon: '₳' },
    { value: 'MATIC-USDT', label: 'Polygon (MATIC/USDT)', icon: '⬢' },
    { value: 'DOT-USDT', label: 'Polkadot (DOT/USDT)', icon: '●' },
    { value: 'AVAX-USDT', label: 'Avalanche (AVAX/USDT)', icon: '▲' },
    { value: 'LINK-USDT', label: 'Chainlink (LINK/USDT)', icon: '⚡' },
    { value: 'UNI-USDT', label: 'Uniswap (UNI/USDT)', icon: '🦄' },
    { value: 'LTC-USDT', label: 'Litecoin (LTC/USDT)', icon: 'Ł' }
  ],
  bybit: [
    { value: 'BTC-USDT', label: 'Bitcoin (BTC/USDT)', icon: '₿' },
    { value: 'ETH-USDT', label: 'Ethereum (ETH/USDT)', icon: 'Ξ' },
    { value: 'SOL-USDT', label: 'Solana (SOL/USDT)', icon: '◎' },
    { value: 'ADA-USDT', label: 'Cardano (ADA/USDT)', icon: '₳' },
    { value: 'MATIC-USDT', label: 'Polygon (MATIC/USDT)', icon: '⬢' },
    { value: 'DOT-USDT', label: 'Polkadot (DOT/USDT)', icon: '●' },
    { value: 'AVAX-USDT', label: 'Avalanche (AVAX/USDT)', icon: '▲' },
    { value: 'LINK-USDT', label: 'Chainlink (LINK/USDT)', icon: '⚡' },
    { value: 'XRP-USDT', label: 'Ripple (XRP/USDT)', icon: '◉' },
    { value: 'DOGE-USDT', label: 'Dogecoin (DOGE/USDT)', icon: '🐕' }
  ],
  deribit: [
    { value: 'BTC-USD', label: 'Bitcoin Perpetual (BTC-USD)', icon: '₿' },
    { value: 'ETH-USD', label: 'Ethereum Perpetual (ETH-USD)', icon: 'Ξ' },
    { value: 'SOL-USD', label: 'Solana Perpetual (SOL-USD)', icon: '◎' },
    { value: 'MATIC-USD', label: 'Polygon Perpetual (MATIC-USD)', icon: '⬢' },
    { value: 'AVAX-USD', label: 'Avalanche Perpetual (AVAX-USD)', icon: '▲' },
    { value: 'LINK-USD', label: 'Chainlink Perpetual (LINK-USD)', icon: '⚡' }
  ]
};

export const getSymbolsForVenue = (venue) => {
  return VENUE_SYMBOLS[venue] || [];
};

export const getDefaultSymbolForVenue = (venue) => {
  const symbols = getSymbolsForVenue(venue);
  return symbols.length > 0 ? symbols[0].value : '';
};

export const formatSymbolForVenue = (symbol, venue) => {
  // Convert symbol format for different venues
  switch (venue) {
    case 'okx':
    case 'bybit':
      return symbol.replace('-', '-'); // Already in correct format
    case 'deribit':
      return symbol.replace('-USDT', '-USD'); // Convert USDT to USD for Deribit
    default:
      return symbol;
  }
}; 