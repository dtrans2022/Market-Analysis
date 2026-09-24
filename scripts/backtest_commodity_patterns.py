"""Backtest candle patterns at support/resistance zones for major commodities.

Fetches one year of daily OHLC data from Yahoo Finance, computes swing-based
support/resistance levels, detects candle patterns on each bar, and reports the
patterns with the highest directional success rate when they occur at or near
those levels.
"""

from __future__ import annotations

import json
import math
import sys
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from statistics import mean
from typing import Iterable

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1y&interval=1d"

COMMODITIES = [
    ("Gold", "GC=F"),
    ("Silver", "SI=F"),
    ("Copper", "HG=F"),
    ("WTI Crude Oil", "CL=F"),
    ("Brent Crude Oil", "BZ=F"),
    ("Natural Gas", "NG=F"),
    ("Heating Oil", "HO=F"),
    ("RBOB Gasoline", "RB=F"),
]

PIVOT_WINDOW = 5
ZONE_TOUCH_PCT = 0.010
LOOKAHEAD = 5
BULLISH_PATTERNS = {
    "hammer",
    "inverted-hammer",
    "dragonfly-doji",
    "bullish-engulfing",
    "piercing-line",
    "tweezer-bottom",
    "bullish-harami",
    "morning-star",
    "three-white-soldiers",
    "three-inside-up",
    "three-outside-up",
    "bullish-marubozu",
}
BEARISH_PATTERNS = {
    "hanging-man",
    "shooting-star",
    "gravestone-doji",
    "bearish-engulfing",
    "dark-cloud-cover",
    "tweezer-top",
    "bearish-harami",
    "evening-star",
    "three-black-crows",
    "three-inside-down",
    "three-outside-down",
    "bearish-marubozu",
}


@dataclass
class Candle:
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


def fetch_candles(symbol: str) -> list[Candle]:
    request = urllib.request.Request(
        YAHOO_URL.format(symbol=symbol),
        headers={"User-Agent": "Mozilla/5.0 backtest"},
    )
    with urllib.request.urlopen(request, timeout=30) as resp:
        payload = json.load(resp)

    result = payload["chart"]["result"][0]
    timestamps = result["timestamp"]
    quotes = result["indicators"]["quote"][0]

    opens = quotes["open"]
    highs = quotes["high"]
    lows = quotes["low"]
    closes = quotes["close"]
    volumes = quotes.get("volume", [0] * len(closes))

    candles: list[Candle] = []
    for i, ts in enumerate(timestamps):
        if None in (opens[i], highs[i], lows[i], closes[i]):
            continue
        candles.append(
            Candle(
                time=datetime.utcfromtimestamp(ts),
                open=float(opens[i]),
                high=float(highs[i]),
                low=float(lows[i]),
                close=float(closes[i]),
                volume=float(volumes[i] or 0),
            )
        )
    return candles


def pivot_zones(candles: list[Candle], window: int = PIVOT_WINDOW) -> tuple[list[float], list[float]]:
    supports: list[float] = []
    resistances: list[float] = []
    for i in range(window, len(candles) - window):
        segment = candles[i - window : i + window + 1]
        pivot = candles[i]
        if pivot.low == min(c.low for c in segment):
            supports.append(pivot.low)
        if pivot.high == max(c.high for c in segment):
            resistances.append(pivot.high)
    return supports, resistances


def near_zone(price: float, zones: Iterable[float], tolerance: float) -> bool:
    for zone in zones:
        if zone == 0:
            continue
        if abs(price - zone) / zone <= tolerance:
            return True
    return False


def body(candle: Candle) -> float:
    return abs(candle.close - candle.open)


def upper_wick(candle: Candle) -> float:
    return candle.high - max(candle.open, candle.close)


def lower_wick(candle: Candle) -> float:
    return min(candle.open, candle.close) - candle.low


def is_bullish(candle: Candle) -> bool:
    return candle.close > candle.open


def is_bearish(candle: Candle) -> bool:
    return candle.close < candle.open


def range_size(candle: Candle) -> float:
    return max(candle.high - candle.low, 1e-9)


def detect_patterns(candles: list[Candle], index: int) -> list[str]:
    if index < 2:
        return []

    c0 = candles[index - 2]
    c1 = candles[index - 1]
    c2 = candles[index]
    patterns: list[str] = []

    body2 = body(c2)
    rng2 = range_size(c2)

    if body2 <= 0.1 * rng2:
        if lower_wick(c2) >= 0.6 * rng2 and upper_wick(c2) <= 0.1 * rng2:
            patterns.append("dragonfly-doji")
        elif upper_wick(c2) >= 0.6 * rng2 and lower_wick(c2) <= 0.1 * rng2:
            patterns.append("gravestone-doji")
        else:
            patterns.append("doji")

    if body2 <= 0.3 * rng2 and lower_wick(c2) >= 2 * body2 and upper_wick(c2) <= body2:
        if c1.close < c0.close:
            patterns.append("hammer")
        else:
            patterns.append("hanging-man")

    if body2 <= 0.3 * rng2 and upper_wick(c2) >= 2 * body2 and lower_wick(c2) <= body2:
        if c1.close < c0.close:
            patterns.append("inverted-hammer")
        else:
            patterns.append("shooting-star")

    if body2 >= 0.9 * rng2:
        if is_bullish(c2):
            patterns.append("bullish-marubozu")
        else:
            patterns.append("bearish-marubozu")

    if is_bearish(c1) and is_bullish(c2) and c2.open <= c1.close and c2.close >= c1.open:
        patterns.append("bullish-engulfing")
    if is_bullish(c1) and is_bearish(c2) and c2.open >= c1.close and c2.close <= c1.open:
        patterns.append("bearish-engulfing")

    mid1 = (c1.open + c1.close) / 2
    if is_bearish(c1) and is_bullish(c2) and c2.open < c1.close and c2.close > mid1 and c2.close < c1.open:
        patterns.append("piercing-line")
    if is_bullish(c1) and is_bearish(c2) and c2.open > c1.close and c2.close < mid1 and c2.close > c1.open:
        patterns.append("dark-cloud-cover")

    if is_bearish(c1) and is_bullish(c2) and c2.open > c1.close and c2.close < c1.open:
        patterns.append("bullish-harami")
    if is_bullish(c1) and is_bearish(c2) and c2.open < c1.close and c2.close > c1.open:
        patterns.append("bearish-harami")

    if abs(c1.low - c2.low) / max(c1.low, 1e-9) <= 0.001 and is_bullish(c2):
        patterns.append("tweezer-bottom")
    if abs(c1.high - c2.high) / max(c1.high, 1e-9) <= 0.001 and is_bearish(c2):
        patterns.append("tweezer-top")

    if index >= 2:
        if (
            is_bearish(c0)
            and body(c1) <= 0.3 * range_size(c1)
            and is_bullish(c2)
            and c2.close >= (c0.open + c0.close) / 2
        ):
            patterns.append("morning-star")
        if (
            is_bullish(c0)
            and body(c1) <= 0.3 * range_size(c1)
            and is_bearish(c2)
            and c2.close <= (c0.open + c0.close) / 2
        ):
            patterns.append("evening-star")

    if index >= 2 and is_bullish(c0) and is_bullish(c1) and is_bullish(c2):
        if c2.close > c1.close > c0.close and body(c1) > 0.3 * range_size(c1) and body(c2) > 0.3 * range_size(c2):
            patterns.append("three-white-soldiers")
    if index >= 2 and is_bearish(c0) and is_bearish(c1) and is_bearish(c2):
        if c2.close < c1.close < c0.close and body(c1) > 0.3 * range_size(c1) and body(c2) > 0.3 * range_size(c2):
            patterns.append("three-black-crows")

    return patterns


def evaluate_success(
    candles: list[Candle],
    index: int,
    pattern: str,
) -> bool | None:
    if index + LOOKAHEAD >= len(candles):
        return None

    entry = candles[index].close
    look_slice = candles[index + 1 : index + 1 + LOOKAHEAD]
    highest = max(c.high for c in look_slice)
    lowest = min(c.low for c in look_slice)
    final = look_slice[-1].close

    if pattern in BULLISH_PATTERNS:
        return final > entry and highest > entry
    if pattern in BEARISH_PATTERNS:
        return final < entry and lowest < entry
    return None


def backtest(name: str, symbol: str) -> dict[str, dict[str, int]]:
    try:
        candles = fetch_candles(symbol)
    except Exception as exc:
        print(f"[warn] Failed to fetch {name} ({symbol}): {exc}")
        return {}

    if len(candles) < 40:
        print(f"[warn] Not enough candles for {name}")
        return {}

    supports, resistances = pivot_zones(candles)
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "success": 0})

    for i in range(PIVOT_WINDOW, len(candles) - LOOKAHEAD - 1):
        candle = candles[i]
        patterns = detect_patterns(candles, i)
        if not patterns:
            continue

        near_support = near_zone(candle.low, supports, ZONE_TOUCH_PCT) or near_zone(candle.close, supports, ZONE_TOUCH_PCT)
        near_resistance = near_zone(candle.high, resistances, ZONE_TOUCH_PCT) or near_zone(candle.close, resistances, ZONE_TOUCH_PCT)

        for pattern in patterns:
            zone_type = None
            if pattern in BULLISH_PATTERNS and near_support:
                zone_type = "support"
            elif pattern in BEARISH_PATTERNS and near_resistance:
                zone_type = "resistance"
            if zone_type is None:
                continue

            outcome = evaluate_success(candles, i, pattern)
            if outcome is None:
                continue

            key = f"{pattern}@{zone_type}"
            stats[key]["total"] += 1
            if outcome:
                stats[key]["success"] += 1

    return stats


def print_report(name: str, stats: dict[str, dict[str, int]]) -> None:
    print(f"\n=== {name} ===")
    if not stats:
        print("  no qualifying pattern/zone occurrences")
        return

    ranked = sorted(
        stats.items(),
        key=lambda kv: (kv[1]["success"] / kv[1]["total"] if kv[1]["total"] else 0, kv[1]["total"]),
        reverse=True,
    )
    print(f"  {'Pattern @ Zone':38} {'Occurrences':>11} {'Success':>7} {'Rate':>7}")
    for key, counts in ranked:
        total = counts["total"]
        succ = counts["success"]
        rate = 100 * succ / total if total else 0
        print(f"  {key:38} {total:>11} {succ:>7} {rate:>6.1f}%")


def aggregate(all_stats: dict[str, dict[str, dict[str, int]]]) -> dict[str, dict[str, int]]:
    total_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "success": 0})
    for stats in all_stats.values():
        for key, counts in stats.items():
            total_stats[key]["total"] += counts["total"]
            total_stats[key]["success"] += counts["success"]
    return total_stats


def main() -> int:
    all_stats: dict[str, dict[str, dict[str, int]]] = {}
    for name, symbol in COMMODITIES:
        stats = backtest(name, symbol)
        all_stats[name] = stats
        print_report(name, stats)

    print("\n=== Combined commodities ===")
    combined = aggregate(all_stats)
    print_report("Combined", combined)

    print("\n=== Best pattern per commodity (min 3 occurrences) ===")
    for name, stats in all_stats.items():
        eligible = [(k, v) for k, v in stats.items() if v["total"] >= 3]
        if not eligible:
            print(f"  {name}: no pattern reached minimum sample size")
            continue
        best = max(eligible, key=lambda kv: kv[1]["success"] / kv[1]["total"])
        rate = 100 * best[1]["success"] / best[1]["total"]
        print(f"  {name}: {best[0]} — {best[1]['success']}/{best[1]['total']} ({rate:.1f}%)")

    print("\n=== Overall top winners (min 5 occurrences) ===")
    eligible = [(k, v) for k, v in combined.items() if v["total"] >= 5]
    if not eligible:
        print("  no qualifying combined patterns")
    else:
        ranked = sorted(eligible, key=lambda kv: kv[1]["success"] / kv[1]["total"], reverse=True)
        for key, counts in ranked[:10]:
            rate = 100 * counts["success"] / counts["total"]
            print(f"  {key:38} {counts['total']:>4} {counts['success']:>4} {rate:>6.1f}%")

    return 0


if __name__ == "__main__":
    sys.exit(main())
