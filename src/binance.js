// Everything that talks to Binance is in this file.
// These are public market data addresses, so no account or API key is needed.

const API_URL = 'https://data-api.binance.vision/api/v3';
const STREAM_URL = 'wss://data-stream.binance.vision/ws';

const CANDLES_PER_REQUEST = 1000;
const REQUEST_COUNT = 5;

/** Tells candlekit what Binance calls the time, price, and amount of a trade. */
export const BINANCE_FIELDS = { timestamp: 'T', price: 'p', amount: 'q' };

/** Binance sends each candle as a list, so give the values names. */
function toCandle(row) {
  return {
    time: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    trades: row[8],
  };
}

/** Downloads about 3.5 days of 1-minute candles, oldest first. */
export async function fetchMinuteCandles(symbol) {
  let candles = [];
  let endTime = Date.now();

  for (let request = 0; request < REQUEST_COUNT; request++) {
    const url =
      `${API_URL}/klines?symbol=${symbol}&interval=1m` +
      `&limit=${CANDLES_PER_REQUEST}&endTime=${endTime}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance returned status ${response.status}`);
    }
    const rows = await response.json();
    candles = [...rows.map(toCandle), ...candles];
    endTime = rows[0][0] - 1;
  }
  return candles;
}

/**
 * Calls `onTrade` for every new trade. Returns a function that stops listening.
 * `onStatus` receives 'live' when connected and 'closed' when the connection ends.
 */
export function watchTrades(symbol, onTrade, onStatus) {
  const socket = new WebSocket(`${STREAM_URL}/${symbol.toLowerCase()}@aggTrade`);

  socket.onopen = () => onStatus('live');
  socket.onmessage = (event) => onTrade(JSON.parse(event.data));
  socket.onclose = () => onStatus('closed');

  return () => {
    socket.onclose = null;
    socket.close();
  };
}
