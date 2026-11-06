// Everything that draws on the screen is in this file.

import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
} from 'lightweight-charts';

const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';
const VOLUME_UP_COLOR = 'rgba(38, 166, 154, 0.35)';
const VOLUME_DOWN_COLOR = 'rgba(239, 83, 80, 0.35)';
const CANDLES_TO_SHOW = 120;

// The chart library wants time in seconds, but candlekit uses milliseconds.
const toChartTime = (milliseconds) => milliseconds / 1000;

function toCandlePoint(candle) {
  const { time, open, high, low, close } = candle;
  return { time: toChartTime(time), open, high, low, close };
}

function toVolumePoint(candle) {
  return {
    time: toChartTime(candle.time),
    value: candle.volume,
    color: candle.close >= candle.open ? VOLUME_UP_COLOR : VOLUME_DOWN_COLOR,
  };
}

/** Indicators are null until there is enough data, so leave those points out. */
function toLinePoints(candles, values) {
  return candles
    .map((candle, index) => ({ time: toChartTime(candle.time), value: values[index] }))
    .filter((point) => point.value !== null);
}

/** Small coins need more decimal places than big ones. */
function priceFormatFor(price) {
  let precision = 5;
  if (price >= 100) precision = 2;
  else if (price >= 1) precision = 3;
  return { type: 'price', precision, minMove: 10 ** -precision };
}

export function createTradingChart(container) {
  const chart = createChart(container, {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: '#0f141c' },
      textColor: '#8d98a8',
    },
    grid: {
      vertLines: { color: '#1b2330' },
      horzLines: { color: '#1b2330' },
    },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2a3342' },
    rightPriceScale: { borderColor: '#2a3342' },
  });

  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: UP_COLOR,
    downColor: DOWN_COLOR,
    wickUpColor: UP_COLOR,
    wickDownColor: DOWN_COLOR,
    borderVisible: false,
  });

  // Volume bars sit along the bottom of the main chart.
  const volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  });
  chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

  const lineOptions = { lineWidth: 2, priceLineVisible: false, lastValueVisible: false };
  const smaSeries = chart.addSeries(LineSeries, { ...lineOptions, color: '#f5b83d' });
  const emaSeries = chart.addSeries(LineSeries, { ...lineOptions, color: '#4da3ff' });

  // RSI goes in its own area below the main chart. The main chart gets 3 parts
  // of the height, and RSI gets 1.
  const rsiSeries = chart.addSeries(LineSeries, { ...lineOptions, color: '#b98cff' }, 1);
  chart.panes()[0].setStretchFactor(3);
  chart.panes()[1].setStretchFactor(1);

  // Lines at 70 and 30, the usual RSI levels.
  for (const price of [70, 30]) {
    rsiSeries.createPriceLine({
      price,
      color: '#566274',
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });
  }

  return {
    /** Replaces everything on the chart. Use it after changing coin or interval. */
    showAll({ candles, sma, ema, rsi }) {
      candleSeries.applyOptions({ priceFormat: priceFormatFor(candles.at(-1).close) });
      candleSeries.setData(candles.map(toCandlePoint));
      volumeSeries.setData(candles.map(toVolumePoint));
      smaSeries.setData(toLinePoints(candles, sma));
      emaSeries.setData(toLinePoints(candles, ema));
      rsiSeries.setData(toLinePoints(candles, rsi));

      chart.timeScale().setVisibleLogicalRange({
        from: candles.length - CANDLES_TO_SHOW,
        to: candles.length + 3,
      });
    },

    /** Updates only the newest values. Use it for live trades. */
    showLatest({ candles, sma, ema, rsi }) {
      candleSeries.update(toCandlePoint(candles.at(-1)));
      volumeSeries.update(toVolumePoint(candles.at(-1)));

      const updates = [
        [smaSeries, sma],
        [emaSeries, ema],
        [rsiSeries, rsi],
      ];
      for (const [series, values] of updates) {
        const newest = toLinePoints(candles, values).at(-1);
        if (newest) series.update(newest);
      }
    },
  };
}
