from pathlib import Path

root = Path(r"c:\Users\Surface\Market-Analysis")
market_dirs = ["forex", "commodities", "shares"]

patterns = [
    ("doji", "Doji", "neutral", "Open and close are nearly equal, showing indecision and a pause rather than immediate directional conviction.", "Use it as a balance check near support or resistance and wait for confirmation from the next candle.", "Do not treat it as a directional signal without confirmation or context."),
    ("dragonfly-doji", "Dragonfly Doji", "bullish", "A long lower wick with a close near the high shows buyers reabsorbed selling pressure.", "Most useful at support after a decline, with bullish confirmation.", "Do not trust it in a strong uptrend or when price is far from support."),
    ("gravestone-doji", "Gravestone Doji", "bearish", "A long upper wick with a close near the low shows sellers rejected a higher move.", "Most useful at resistance after an advance, with bearish confirmation.", "Do not treat it as bearish without rejection at a supply zone."),
    ("hammer", "Hammer", "bullish", "A small body with a long lower wick indicates rejection of lower prices.", "Look for this pattern near support after downside pressure.", "Avoid using it in a strong rally when no support zone is present."),
    ("inverted-hammer", "Inverted Hammer", "bullish", "A small body with a long upper wick shows attempted buying pressure that was rejected.", "Use it after a decline only if the next candle confirms the bullish reversal.", "Do not rely on it as a standalone reversal signal."),
    ("hanging-man", "Hanging Man", "bearish", "A hammer-like candle after an advance warns of distribution.", "Use it near resistance with bearish confirmation.", "Do not take it as a bearish reversal in a flat range without context."),
    ("bullish-spinning-top", "Bullish Spinning Top", "bullish", "A small bullish body with meaningful upper and lower shadows reflects slight buyer control.", "Useful as a soft continuation clue in a trend or range.", "Do not treat it as a strong signal without follow-through."),
    ("bearish-spinning-top", "Bearish Spinning Top", "bearish", "A small bearish body with meaningful upper and lower shadows reflects slight seller control.", "Useful in a downtrend or near resistance as a cautionary sign.", "Do not trade it alone without a confirming close."),
    ("bullish-marubozu", "Bullish Marubozu", "bullish", "A long bullish candle with very small shadows indicates sustained buyer control.", "Strongest on breakouts and in confirmed trends.", "Avoid using it as a blind continuation signal after a runaway move."),
    ("bullish-kicker", "Bullish Kicker", "bullish", "A bearish candle is followed by a strong bullish candle with decisive displacement.", "Useful as a rapid sentiment reversal when the gap or shift is genuine.", "Do not use it on synthetic or heavily aggregated candle data."),
    ("bearish-kicker", "Bearish Kicker", "bearish", "A bullish candle is followed by a strong bearish candle with decisive displacement.", "Useful at resistance as a fast bearish shift.", "Do not use it on low-quality aggregated candles or artificial gaps."),
    ("bullish-engulfing", "Bullish Engulfing", "bullish", "A bullish candle fully covers the prior bearish real body and often signals reversal.", "Best after a decline and near a historical support zone.", "Do not interpret it as a reversal after a long rally without support context."),
    ("bearish-engulfing", "Bearish Engulfing", "bearish", "A bearish candle fully covers the prior bullish real body and often signals reversal.", "Best after an advance and near a resistance zone.", "Do not force it in a range without rejection."),
    ("piercing-line", "Piercing Line", "bullish", "A bullish candle closes above the midpoint of the previous bearish body but remains below that candle's open.", "Use after a decline near support to confirm a reversal attempt.", "Do not use it as a standalone bullish trigger when the trend remains strongly bearish."),
    ("dark-cloud-cover", "Dark Cloud Cover", "bearish", "A bearish candle closes below the midpoint of the previous bullish body but remains above that candle's open.", "Use after an advance near resistance for a bearish reversal signal.", "Do not trust it without rejection at supply."),
    ("tweezer-bottom", "Tweezer Bottom", "bullish", "Two candles test the same low, suggesting support absorption and a bullish reversal.", "Most valid at key support zones.", "Do not trade it if the lows are not near the same price level."),
    ("tweezer-top", "Tweezer Top", "bearish", "Two candles test the same high, suggesting resistance absorption and a bearish reversal.", "Most valid at key resistance zones.", "Do not trade it if the highs are not comparable."),
    ("bullish-harami", "Bullish Harami", "bullish", "A smaller bullish candle forms inside the previous large bearish real body.", "Signals weakening selling pressure; use it with confirmation.", "Do not assume a turn without follow-through."),
    ("bearish-harami", "Bearish Harami", "bearish", "A smaller bearish candle forms inside the previous large bullish real body.", "Signals weakening buying pressure; use it with confirmation.", "Do not assume a turn without follow-through."),
    ("rising-window", "Rising Window", "bullish", "A gap higher creates an upward break in the range and often confirms continuation.", "Use it where real gaps are valid and supported by trend context.", "Do not use it in synthetic continuous forex candles without validating the gap."),
    ("falling-window", "Falling Window", "bearish", "A gap lower creates a downward break and often confirms continuation.", "Use it where real gaps are valid and supported by trend context.", "Do not use it in synthetic or clustered candles without checking for artifact gaps."),
    ("morning-star", "Morning Star", "bullish", "A bearish candle, a small indecision candle, and then a strong bullish candle form a reversal.", "Strongest after a decline near support.", "Do not take it in isolation without support context."),
    ("three-white-soldiers", "Three White Soldiers", "bullish", "Three consecutive strong bullish candles with higher closes signal sustained buying pressure.", "Use it after a pullback or in fresh bullish trends.", "Do not interpret it as continuation if the market is already exhausted."),
    ("three-black-crows", "Three Black Crows", "bearish", "Three substantial bearish candles with lower closes signal conviction and distribution.", "Use it after an advance or at resistance with a clear prior uptrend.", "Do not call it a pattern without prior bullish context."),
    ("three-inside-up", "Three Inside Up", "bullish", "A bearish candle, a contained bullish candle, and a confirming candle indicate reversal upward.", "Good after a decline at support.", "Do not trust it if price remains far from support."),
    ("three-inside-down", "Three Inside Down", "bearish", "A bullish candle, a contained bearish candle, and a confirming candle indicate reversal downward.", "Good after an advance at resistance.", "Do not trust it if price remains far from resistance."),
    ("three-outside-up", "Three Outside Up", "bullish", "A bullish engulfing candle followed by confirmation and recovery.", "Strong bullish reversal near support.", "Do not trade it if the engulfing move is not confirmed."),
    ("three-outside-down", "Three Outside Down", "bearish", "A bearish engulfing candle followed by confirmation and breakdown.", "Strong bearish reversal near resistance.", "Do not trade it if the breakdown lacks follow-through."),
    ("three-line-strike", "Three Line Strike", "continuation", "Three candles move in one direction and a fourth strong candle reverses sharply through the previous range.", "Use it as a warning of exhaustion requiring confirmation before trading.", "Do not assume a reversal without context."),
    ("bullish-abandoned-baby", "Bullish Abandoned Baby", "bullish", "A bearish candle, isolated doji, and bullish candle form with gaps separating the doji.", "Rare but powerful reversal when the gaps are real.", "Do not create it from ordinary continuous data without genuine gaps."),
    ("bearish-abandoned-baby", "Bearish Abandoned Baby", "bearish", "A bullish candle, isolated doji, and bearish candle form with gaps separating the doji.", "Rare but powerful reversal when the gaps are real.", "Do not create it from ordinary continuous data without genuine gaps."),
    ("cup-and-handle", "Cup and Handle", "bullish", "A rounded recovery forms the cup and a shallow pullback forms the handle.", "Trade only after the breakout clears the rim with confirmation.", "Do not treat the cup alone as enough to buy."),
    ("double-top", "Double Top", "bearish", "Two failed attempts to push above the same high usually mark a bearish reversal.", "Confirm with a neckline break and weaker follow-through.", "Do not call it a reversal before the neckline breaks."),
    ("double-bottom", "Double Bottom", "bullish", "Two failed attempts to push below the same low usually mark a bullish reversal.", "Confirm with a neckline break and higher closes.", "Do not assume a bottom until the neckline holds."),
    ("doble-bottom", "Doble Bottom", "bullish", "Project-specific misspelling of the double-bottom structure; it should be normalized to the standard label.", "Use the same interpretation as double-bottom.", "Do not treat it as a separate pattern if the canonical double-bottom definition is used."),
    ("wedge", "Wedge", "continuation", "Converging boundaries indicate tightening price action before a directional breakout.", "Use the breakout, not the wedge shape alone, to define direction.", "Do not assume direction from the wedge geometry alone."),
    ("flag", "Flag", "continuation", "A short countertrend consolidation follows a strong directional move.", "Trade in the direction of the prior impulse once the flag breaks.", "Do not trade the flag in isolation without the breakout."),
]

support_zone_templates = {
    "forex": [
        {
            "id": "eurusd-support-zone",
            "name": "EUR/USD Support Zone",
            "zoneType": "support",
            "level": 1.084,
            "strength": "key",
            "patterns": ["hammer", "bullish-engulfing", "morning-star", "double-bottom"],
            "rationale": "Buyers often reject this zone with bullish candle clusters and form a reversal.",
        },
        {
            "id": "eurusd-resistance-zone",
            "name": "EUR/USD Resistance Zone",
            "zoneType": "resistance",
            "level": 1.1,
            "strength": "key",
            "patterns": ["hanging-man", "bearish-engulfing", "three-black-crows", "double-top"],
            "rationale": "Sellers often reassert control here, especially when bearish candles appear at the same supply zone.",
        },
    ],
    "commodities": [
        {
            "id": "gold-support-zone",
            "name": "Gold Support Zone",
            "zoneType": "support",
            "level": 2305,
            "strength": "major",
            "patterns": ["hammer", "dragonfly-doji", "bullish-engulfing", "morning-star"],
            "rationale": "Gold often attracts defensive buying at this level when bullish candle clusters validate support.",
        },
        {
            "id": "gold-resistance-zone",
            "name": "Gold Resistance Zone",
            "zoneType": "resistance",
            "level": 2385,
            "strength": "major",
            "patterns": ["gravestone-doji", "hanging-man", "bearish-engulfing", "three-black-crows"],
            "rationale": "This zone acts as supply, where bearish candles frequently cluster during rejection.",
        },
    ],
    "shares": [
        {
            "id": "nasdaq-support-zone",
            "name": "Nasdaq Support Zone",
            "zoneType": "support",
            "level": 5200,
            "strength": "major",
            "patterns": ["bullish-engulfing", "three-white-soldiers", "double-bottom", "morning-star"],
            "rationale": "Support is often defended by bullish reversal candles with strong participation from buyers.",
        },
        {
            "id": "nasdaq-resistance-zone",
            "name": "Nasdaq Resistance Zone",
            "zoneType": "resistance",
            "level": 5400,
            "strength": "major",
            "patterns": ["bearish-engulfing", "tweezer-top", "double-top", "three-black-crows"],
            "rationale": "A dense supply zone where bearish candles tend to appear after failed breakouts.",
        },
    ],
}

for category in market_dirs:
    skill_dir = root / "mobile" / "src" / "markets" / category / "skills" / "candles"
    skill_dir.mkdir(parents=True, exist_ok=True)

    type_file = skill_dir / "types.ts"
    type_file.write_text(
        'export type CandlePatternBias = "bullish" | "bearish" | "neutral" | "continuation";\n\n'
        'export type CandlePatternSkill = {\n'
        '  id: string;\n'
        '  name: string;\n'
        '  bias: CandlePatternBias;\n'
        '  category: "forex" | "commodities" | "shares";\n'
        '  description: string;\n'
        '  typicalUse: string;\n'
        '  invalidWhen: string;\n'
        '};\n\n'
        'export type SupportResistanceZone = {\n'
        '  id: string;\n'
        '  name: string;\n'
        '  asset: "forex" | "commodities" | "shares";\n'
        '  zoneType: "support" | "resistance";\n'
        '  level: number;\n'
        '  strength: "minor" | "major" | "key";\n'
        '  candlePatterns: string[];\n'
        '  rationale: string;\n'
        '};\n',
        encoding="utf-8",
    )

    index_lines = ['export type { CandlePatternBias, CandlePatternSkill, SupportResistanceZone } from "./types";']
    for pattern_id, pattern_name, bias, description, typical_use, invalid_when in patterns:
        var_name = "".join(part.capitalize() for part in pattern_id.split("-")) + "Skill"
        file_name = f"{pattern_id}.skill.ts"
        content = (
            'import type { CandlePatternSkill } from "./types";\n\n'
            f'export const {var_name}: CandlePatternSkill = {{\n'
            f'  id: "{pattern_id}",\n'
            f'  name: "{pattern_name}",\n'
            f'  bias: "{bias}",\n'
            f'  category: "{category}",\n'
            f'  description: "{description}",\n'
            f'  typicalUse: "{typical_use}",\n'
            f'  invalidWhen: "{invalid_when}"\n'
            '};\n\n'
            f'export default {var_name};\n'
        )
        (skill_dir / file_name).write_text(content, encoding="utf-8")
        index_lines.append(f'export {{ default as {var_name} }} from "./{pattern_id}.skill";')

    index_lines.append('export { supportResistanceZones } from "./support-resistance-zones";')
    (skill_dir / "index.ts").write_text("\n".join(index_lines) + "\n", encoding="utf-8")

    zone_lines = [
        'import type { SupportResistanceZone } from "./types";',
        '',
        'export const supportResistanceZones: SupportResistanceZone[] = [',
    ]
    for zone in support_zone_templates[category]:
        zone_lines.extend([
            '  {',
            f'    id: "{zone["id"]}",',
            f'    name: "{zone["name"]}",',
            f'    asset: "{category}",',
            f'    zoneType: "{zone["zoneType"]}",',
            f'    level: {zone["level"]},',
            f'    strength: "{zone["strength"]}",',
            '    candlePatterns: [' + ', '.join(f'"{p}"' for p in zone["patterns"]) + '],',
            f'    rationale: "{zone["rationale"]}",',
            '  },',
        ])
    zone_lines.extend(['];'])
    (skill_dir / "support-resistance-zones.ts").write_text("\n".join(zone_lines) + "\n", encoding="utf-8")

print(f"Created pattern skills for {len(market_dirs)} categories at {root / 'mobile/src/markets'}")
print(f"Pattern count: {len(patterns)} per category")
for category in market_dirs:
    count = len(list((root / 'mobile' / 'src' / 'markets' / category / 'skills' / 'candles').glob('*.skill.ts')))
    print(f"  {category}: {count} skill files")
