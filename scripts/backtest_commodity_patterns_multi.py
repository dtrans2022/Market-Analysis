"""Multi-timeframe candle-pattern backtest for major commodities.

Fetches up to three years of 1h, 4h and 1d Yahoo Finance data, detects candle
patterns at rolling support/resistance zones, records per-occurrence outcomes
including risk/reward, and emits a JSON dataset consumed by the mobile app's
History tab.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?{query}"

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

TIMEFRAMES = [
    {"key": "1h", "yahoo_interval": "1h", "range": "730d", "pivot": 12, "lookahead": 12, "zone_pct": 0.006, "aggregate": 1},
    {"key": "4h", "yahoo_interval": "1h", "range": "730d", "pivot": 8, "lookahead": 8, "zone_pct": 0.008, "aggregate": 4},
    {"key": "1D", "yahoo_interval": "1d", "range": "3y", "pivot": 5, "lookahead": 5, "zone_pct": 0.010, "aggregate": 1},
]

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
    "bearish-marubozu",
}


@dataclass
class Candle:
    time: datetime
    open: float
    high: float
    low: float
    close: float


def fetch_candles(symbol: str, interval: str, range_: str) -> list[Candle]:
    query = urllib.parse.urlencode({"range": range_, "interval": interval, "includePrePost": "false"})
    request = urllib.request.Request(
        YAHOO_URL.format(symbol=symbol, query=query),
        headers={"User-Agent": "Mozilla/5.0 backtest"},
    )
    attempts = 0
    last_error: Exception | None = None
    while attempts < 3:
        try:
            with urllib.request.urlopen(request, timeout=45) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {429, 502, 503, 504}:
                time.sleep(2 + attempts)
                attempts += 1
                continue
            raise
        except Exception as exc:
            last_error = exc
            time.sleep(1 + attempts)
            attempts += 1
    else:
        raise RuntimeError(f"Failed to fetch {symbol} {interval} {range_}: {last_error}")

    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    quotes = result["indicators"]["quote"][0]

    opens = quotes.get("open", [])
    highs = quotes.get("high", [])
    lows = quotes.get("low", [])
    closes = quotes.get("close", [])

    candles: list[Candle] = []
    for i, ts in enumerate(timestamps):
        if i >= len(closes):
            break
        if None in (opens[i], highs[i], lows[i], closes[i]):
            continue
        candles.append(
            Candle(
                time=datetime.fromtimestamp(ts, tz=timezone.utc),
                open=float(opens[i]),
                high=float(highs[i]),
                low=float(lows[i]),
                close=float(closes[i]),
            )
        )
    return candles


def aggregate_candles(candles: list[Candle], factor: int) -> list[Candle]:
    if factor <= 1:
        return candles
    aggregated: list[Candle] = []
    for i in range(0, len(candles) - factor + 1, factor):
        group = candles[i : i + factor]
        aggregated.append(
            Candle(
                time=group[0].time,
                open=group[0].open,
                high=max(c.high for c in group),
                low=min(c.low for c in group),
                close=group[-1].close,
            )
        )
    return aggregated


def pivot_zones(candles: list[Candle], window: int) -> tuple[list[float], list[float]]:
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
        if zone <= 0:
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


def range_size(candle: Candle) -> float:
    return max(candle.high - candle.low, 1e-9)


def is_bull(candle: Candle) -> bool:
    return candle.close > candle.open


def is_bear(candle: Candle) -> bool:
    return candle.close < candle.open


def detect_patterns(candles: list[Candle], index: int) -> list[str]:
    if index < 2:
        return []
    c0, c1, c2 = candles[index - 2], candles[index - 1], candles[index]
    patterns: list[str] = []
    body2 = body(c2)
    rng2 = range_size(c2)

    if body2 <= 0.1 * rng2:
        if lower_wick(c2) >= 0.6 * rng2 and upper_wick(c2) <= 0.1 * rng2:
            patterns.append("dragonfly-doji")
        elif upper_wick(c2) >= 0.6 * rng2 and lower_wick(c2) <= 0.1 * rng2:
            patterns.append("gravestone-doji")

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
        patterns.append("bullish-marubozu" if is_bull(c2) else "bearish-marubozu")

    if is_bear(c1) and is_bull(c2) and c2.open <= c1.close and c2.close >= c1.open:
        patterns.append("bullish-engulfing")
    if is_bull(c1) and is_bear(c2) and c2.open >= c1.close and c2.close <= c1.open:
        patterns.append("bearish-engulfing")

    mid1 = (c1.open + c1.close) / 2
    if is_bear(c1) and is_bull(c2) and c2.open < c1.close and c2.close > mid1 and c2.close < c1.open:
        patterns.append("piercing-line")
    if is_bull(c1) and is_bear(c2) and c2.open > c1.close and c2.close < mid1 and c2.close > c1.open:
        patterns.append("dark-cloud-cover")

    if is_bear(c1) and is_bull(c2) and c2.open > c1.close and c2.close < c1.open:
        patterns.append("bullish-harami")
    if is_bull(c1) and is_bear(c2) and c2.open < c1.close and c2.close > c1.open:
        patterns.append("bearish-harami")

    if abs(c1.low - c2.low) / max(c1.low, 1e-9) <= 0.001 and is_bull(c2):
        patterns.append("tweezer-bottom")
    if abs(c1.high - c2.high) / max(c1.high, 1e-9) <= 0.001 and is_bear(c2):
        patterns.append("tweezer-top")

    if (
        is_bear(c0)
        and body(c1) <= 0.3 * range_size(c1)
        and is_bull(c2)
        and c2.close >= (c0.open + c0.close) / 2
    ):
        patterns.append("morning-star")
    if (
        is_bull(c0)
        and body(c1) <= 0.3 * range_size(c1)
        and is_bear(c2)
        and c2.close <= (c0.open + c0.close) / 2
    ):
        patterns.append("evening-star")

    if is_bull(c0) and is_bull(c1) and is_bull(c2):
        if c2.close > c1.close > c0.close and body(c1) > 0.3 * range_size(c1) and body(c2) > 0.3 * range_size(c2):
            patterns.append("three-white-soldiers")
    if is_bear(c0) and is_bear(c1) and is_bear(c2):
        if c2.close < c1.close < c0.close and body(c1) > 0.3 * range_size(c1) and body(c2) > 0.3 * range_size(c2):
            patterns.append("three-black-crows")

    return patterns


def evaluate_outcome(candles: list[Candle], index: int, pattern: str, lookahead: int) -> dict | None:
    if index + lookahead >= len(candles):
        return None

    entry = candles[index].close
    look_slice = candles[index + 1 : index + 1 + lookahead]
    highest = max(c.high for c in look_slice)
    lowest = min(c.low for c in look_slice)
    final = look_slice[-1].close

    is_bullish = pattern in BULLISH_PATTERNS
    is_bearish = pattern in BEARISH_PATTERNS
    if not (is_bullish or is_bearish):
        return None

    if is_bullish:
        reward = max(0.0, highest - entry)
        risk = max(0.0, entry - lowest)
        direction = "bullish"
        success = final > entry and highest > entry
    else:
        reward = max(0.0, entry - lowest)
        risk = max(0.0, highest - entry)
        direction = "bearish"
        success = final < entry and lowest < entry

    min_risk = max(entry * 0.001, 1e-6)
    effective_risk = max(risk, min_risk)
    rr = min(reward / effective_risk, 10.0) if reward > 0 else 0.0

    return {
        "date": candles[index].time.strftime("%Y-%m-%d %H:%M UTC"),
        "timestamp": int(candles[index].time.timestamp()),
        "direction": direction,
        "entry": round(entry, 4),
        "reward": round(reward, 4),
        "risk": round(risk, 4),
        "riskReward": round(rr, 2),
        "success": bool(success),
    }


def backtest(name: str, symbol: str, tf: dict) -> list[dict]:
    print(f"[{tf['key']}] fetching {name} ({symbol}) ...", flush=True)
    try:
        raw = fetch_candles(symbol, tf["yahoo_interval"], tf["range"])
    except Exception as exc:
        print(f"  [warn] fetch failed: {exc}")
        return []

    candles = aggregate_candles(raw, tf["aggregate"]) if tf["aggregate"] > 1 else raw
    if len(candles) < tf["pivot"] * 3:
        print(f"  [warn] not enough candles ({len(candles)})")
        return []

    supports, resistances = pivot_zones(candles, tf["pivot"])

    grouped: dict[tuple[str, str], dict] = {}
    for i in range(tf["pivot"], len(candles) - tf["lookahead"] - 1):
        candle = candles[i]
        patterns = detect_patterns(candles, i)
        if not patterns:
            continue
        at_support = near_zone(candle.low, supports, tf["zone_pct"]) or near_zone(candle.close, supports, tf["zone_pct"])
        at_resistance = near_zone(candle.high, resistances, tf["zone_pct"]) or near_zone(candle.close, resistances, tf["zone_pct"])
        for pattern in patterns:
            zone: str | None = None
            if pattern in BULLISH_PATTERNS and at_support:
                zone = "support"
            elif pattern in BEARISH_PATTERNS and at_resistance:
                zone = "resistance"
            if zone is None:
                continue
            outcome = evaluate_outcome(candles, i, pattern, tf["lookahead"])
            if outcome is None:
                continue
            key = (pattern, zone)
            bucket = grouped.setdefault(key, {"pattern": pattern, "zone": zone, "details": []})
            bucket["details"].append(outcome)

    results: list[dict] = []
    for (pattern, zone), bucket in grouped.items():
        details = bucket["details"]
        occurrences = len(details)
        if occurrences < 3:
            continue
        successes = sum(1 for d in details if d["success"])
        failures = occurrences - successes
        success_rate = round(successes / occurrences, 4) if occurrences else 0.0
        rr_values = [d["riskReward"] for d in details]
        avg_rr = round(sum(rr_values) / len(rr_values), 2) if rr_values else 0.0
        avg_reward = round(sum(d["reward"] for d in details) / occurrences, 4)
        avg_risk = round(sum(d["risk"] for d in details) / occurrences, 4)
        details_sorted = sorted(details, key=lambda d: d["timestamp"], reverse=True)[:25]
        results.append(
            {
                "commodity": name,
                "symbol": symbol,
                "timeframe": tf["key"],
                "pattern": pattern,
                "zone": zone,
                "occurrences": occurrences,
                "successes": successes,
                "failures": failures,
                "successRate": success_rate,
                "avgRiskReward": avg_rr,
                "avgReward": avg_reward,
                "avgRisk": avg_risk,
                "details": details_sorted,
            }
        )
    return results


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    output_path = root / "mobile" / "src" / "data" / "commodity-pattern-history.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_records: list[dict] = []
    for tf in TIMEFRAMES:
        for name, symbol in COMMODITIES:
            all_records.extend(backtest(name, symbol, tf))

    all_records.sort(
        key=lambda r: (r["commodity"], r["timeframe"], -r["successRate"], -r["occurrences"])
    )

    dataset = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance (3 years, 1h/4h aggregated / 1D)",
        "timeframes": [tf["key"] for tf in TIMEFRAMES],
        "commodities": [name for name, _ in COMMODITIES],
        "records": all_records,
    }

    output_path.write_text(json.dumps(dataset, indent=2), encoding="utf-8")
    print(f"\nWrote {len(all_records)} pattern records to {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
