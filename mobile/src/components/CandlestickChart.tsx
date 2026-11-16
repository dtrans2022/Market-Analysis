import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

export type ChartCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number; // milliseconds
};

type Props = {
  candles: ChartCandle[];
  width: number;
  height: number;
  support?: number | null;
  resistance?: number | null;
  showMovingAverages?: boolean;
  priceDecimals?: number;
};

function toSeconds(ms: number) {
  return Math.floor(ms / 1000);
}

// Lightweight-charts requires strictly ascending, unique timestamps (in seconds).
function normalizeCandles(candles: ChartCandle[]) {
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const output: { time: number; open: number; high: number; low: number; close: number }[] = [];
  let lastTime = -Infinity;
  for (const candle of sorted) {
    let time = toSeconds(candle.time);
    if (time <= lastTime) {
      time = lastTime + 1;
    }
    lastTime = time;
    output.push({ time, open: candle.open, high: candle.high, low: candle.low, close: candle.close });
  }
  return output;
}

function movingAverage(data: { time: number; close: number }[], period: number) {
  const result: { time: number; value: number }[] = [];
  for (let i = period - 1; i < data.length; i += 1) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export function CandlestickChart({
  candles,
  width,
  height,
  support,
  resistance,
  showMovingAverages = true,
  priceDecimals = 5
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !containerRef.current || candles.length === 0) {
      return;
    }

    const container = containerRef.current;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    void import("lightweight-charts").then((lib) => {
      if (disposed || !container) {
        return;
      }

      const chart = lib.createChart(container, {
        width,
        height,
        layout: { background: { color: "transparent" }, textColor: "#9fb3c8" },
        grid: {
          vertLines: { color: "rgba(140, 170, 190, 0.08)" },
          horzLines: { color: "rgba(140, 170, 190, 0.08)" }
        },
        rightPriceScale: { borderColor: "rgba(140, 170, 190, 0.2)" },
        timeScale: { borderColor: "rgba(140, 170, 190, 0.2)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: lib.CrosshairMode.Normal }
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#00b84d",
        downColor: "#ff3d3d",
        borderUpColor: "#006f2d",
        borderDownColor: "#a00000",
        wickUpColor: "#009f40",
        wickDownColor: "#d32f2f",
        priceFormat: { type: "price", precision: priceDecimals, minMove: 1 / 10 ** priceDecimals }
      });

      const normalized = normalizeCandles(candles);
      candleSeries.setData(normalized as never);

      if (showMovingAverages && normalized.length >= 20) {
        const ma20 = chart.addLineSeries({ color: "#4fc3f7", lineWidth: 1 });
        ma20.setData(movingAverage(normalized, 20) as never);
      }
      if (showMovingAverages && normalized.length >= 50) {
        const ma50 = chart.addLineSeries({ color: "#ffb74d", lineWidth: 1 });
        ma50.setData(movingAverage(normalized, 50) as never);
      }

      if (typeof support === "number" && Number.isFinite(support)) {
        candleSeries.createPriceLine({
          price: support,
          color: "#36d28f",
          lineWidth: 1,
          lineStyle: lib.LineStyle.Dashed,
          axisLabelVisible: true,
          title: "S"
        } as never);
      }
      if (typeof resistance === "number" && Number.isFinite(resistance)) {
        candleSeries.createPriceLine({
          price: resistance,
          color: "#ff6b6b",
          lineWidth: 1,
          lineStyle: lib.LineStyle.Dashed,
          axisLabelVisible: true,
          title: "R"
        } as never);
      }

      chart.timeScale().fitContent();
      cleanup = () => chart.remove();
    });

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [candles, width, height, support, resistance, showMovingAverages, priceDecimals]);

  if (Platform.OS !== "web") {
    return null;
  }

  // react-native-web renders View as a div; attach the chart to its DOM node.
  return <View ref={containerRef as never} style={{ width, height }} />;
}
