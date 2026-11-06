// This file connects everything:
// Binance trades -> candlekit -> chart on the screen

import { ema, fillGaps, resample, rsi, sma, toCandles } from 'candlekit';
import { BINANCE_FIELDS, fetchMinuteCandles, watchTrades } from './binance.js';
import { createTradingChart } from './chart.js';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

// Binance has no 7-minute candles, but candlekit can make them.
const INTERVALS = ['1m', '5m', '7m', '15m', '1h'];

const UPDATE_EVERY_MS = 1000;

const symbolSelect = document.querySelector('#symbol');
const intervalButtons = document.querySelector('#intervals');
const lastPrice = document.querySelector('#last-price');
const priceChange = document.querySelector('#price-change');
const rsiValue = document.querySelector('#rsi-value');
const status = document.querySelector('#status');

const chart = createTradingChart(document.querySelector('#chart'));

let symbol = SYMBOLS[0];
let interval = '5m';
let minuteCandles = [];
let newTrades = [];
let stopWatching = () => {};
let isLoaded = false;

// Each load gets a number, so an old slow download can't replace a newer one.
let latestLoad = 0;

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

/** Adds new live trades to the 1-minute candles. */
function addNewTrades() {
  const newCandles = toCandles(newTrades, { interval: '1m', fields: BINANCE_FIELDS });
  newTrades = [];
  // resample joins the two candles when a minute appears in both lists.
  minuteCandles = resample([...minuteCandles, ...newCandles], '1m');
}

/** Uses candlekit to turn 1-minute candles into everything the chart shows. */
function calculate() {
  const candles = resample(fillGaps(minuteCandles, '1m'), interval);
  const closes = candles.map((candle) => candle.close);
  return { candles, sma: sma(closes, 20), ema: ema(closes, 50), rsi: rsi(closes, 14) };
}

function showPrice({ candles, rsi: rsiValues }) {
  const newest = candles.at(-1);
  const percent = ((newest.close - newest.open) / newest.open) * 100;
  const decimals = newest.close >= 100 ? 2 : newest.close >= 1 ? 3 : 5;

  lastPrice.textContent = newest.close.toFixed(decimals);
  priceChange.textContent = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  priceChange.className = percent >= 0 ? 'up' : 'down';
  rsiValue.textContent = rsiValues.at(-1)?.toFixed(1) ?? '-';
}

function showEverything() {
  const result = calculate();
  chart.showAll(result);
  showPrice(result);
}

function showLiveUpdate() {
  if (!isLoaded || newTrades.length === 0) return;
  addNewTrades();
  const result = calculate();
  chart.showLatest(result);
  showPrice(result);
}

async function load() {
  const thisLoad = ++latestLoad;
  stopWatching();
  stopWatching = () => {};
  isLoaded = false;
  newTrades = [];
  showStatus('Loading...');

  try {
    const candles = await fetchMinuteCandles(symbol);
    if (thisLoad !== latestLoad) return;

    minuteCandles = candles;
    isLoaded = true;
    showEverything();

    stopWatching = watchTrades(
      symbol,
      (trade) => newTrades.push(trade),
      (state) => {
        if (state === 'live') showStatus('Live');
        else showStatus('Disconnected. Reload the page to reconnect.', true);
      },
    );
  } catch (error) {
    if (thisLoad !== latestLoad) return;
    showStatus(`Could not load prices: ${error.message}`, true);
  }
}

function showIntervalButtons() {
  intervalButtons.replaceChildren(
    ...INTERVALS.map((value) => {
      const button = document.createElement('button');
      button.textContent = value;
      button.classList.toggle('active', value === interval);
      button.addEventListener('click', () => {
        interval = value;
        showIntervalButtons();
        if (isLoaded) showEverything();
      });
      return button;
    }),
  );
}

symbolSelect.append(...SYMBOLS.map((value) => new Option(value.replace('USDT', '/USDT'), value)));
symbolSelect.addEventListener('change', () => {
  symbol = symbolSelect.value;
  load();
});

showIntervalButtons();
load();
setInterval(showLiveUpdate, UPDATE_EVERY_MS);
