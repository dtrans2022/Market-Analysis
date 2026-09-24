import json
import pathlib
from collections import Counter

path = pathlib.Path(r"c:\Users\Surface\Market-Analysis\mobile\src\data\commodity-pattern-history.json")
data = json.loads(path.read_text())
records = data["records"]

by_tf = Counter(r["timeframe"] for r in records)
print(f"records={len(records)} by_timeframe={dict(by_tf)}")

for tf in ("1h", "4h", "1D"):
    subset = [r for r in records if r["timeframe"] == tf and r["occurrences"] >= 5]
    ranked = sorted(subset, key=lambda r: (-r["successRate"], -r["occurrences"]))[:5]
    print(f"\n== Top 5 [{tf}] (min 5 occurrences) ==")
    for r in ranked:
        print(f"  {r['commodity']:<18} {r['pattern']+'@'+r['zone']:<32} n={r['occurrences']:<3} {r['successRate']*100:5.1f}%  RR={r['avgRiskReward']}")
