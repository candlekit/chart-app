# Candlekit Live Chart

A live crypto candlestick chart built with [candlekit](../README.md) and real Binance prices. No account or API key is needed.

## Run it

Build candlekit once from the main folder, then start the app:

```bash
cd ..
npm install
npm run build
cd chart-app
npm install
npm run dev
```

Open the address it prints, which is usually http://localhost:5173.

## How it works

```text
Binance -> candlekit -> Lightweight Charts -> your browser
```

| File | Job |
| --- | --- |
| [src/binance.js](src/binance.js) | Downloads candles and listens for live trades |
| [src/main.js](src/main.js) | Uses candlekit to prepare the data, and handles the buttons |
| [src/chart.js](src/chart.js) | Draws the chart with Lightweight Charts |

This app uses these candlekit functions:

- `toCandles` turns each second's live trades into candles.
- `resample` makes the 5m, 7m, 15m, and 1h candles from 1-minute candles.
- `fillGaps` adds candles for minutes with no trades.
- `sma`, `ema`, and `rsi` calculate the indicators.

Binance has no 7-minute candles, so the `7m` button shows something candlekit can do that the exchange can't.

## Limits

- It shows about 3.5 days of history.
- If the connection drops, reload the page to reconnect.
- Trades that happen between loading the history and connecting to the live stream are missed, so the current candle's volume can be slightly low.

This app is a demo, not financial advice.

## Author

Floyd J. Reagan ([floydreagan36@proton.me](mailto:floydreagan36@proton.me))

Repository: https://github.com/candlekit/candlekit
