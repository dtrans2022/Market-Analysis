const { DynamoDBClient } = require("./lambda-live-api/node_modules/@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("./lambda-live-api/node_modules/@aws-sdk/lib-dynamodb");

const tableName = process.env.MT4_SNAPSHOT_TABLE || "market-analysis-mt4-snapshot";
const partitionKey = process.env.MT4_SNAPSHOT_PK_NAME || "snapshotKey";
const symbols = [
  "AUDUSD=X", "EURUSD=X", "GBPUSD=X", "AUDJPY=X", "EURAUD=X", "GBPAUD=X", "AUDNZD=X", "EURNZD=X",
  "EURGBP=X", "CADJPY=X", "CAD=X", "CHF=X", "GBPNZD=X", "NZDJPY=X", "AUDCHF=X", "EURCAD=X", "JPY=X", "EURJPY=X"
];

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

async function fetchDailyCandles(symbol) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5y`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://finance.yahoo.com/"
    }
  });
  if (!response.ok) throw new Error(`${symbol}: Yahoo returned ${response.status}`);

  const result = (await response.json())?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const candles = (result?.timestamp ?? []).map((timestamp, index) => ({
    t: Number(timestamp),
    o: Number(quote?.open?.[index]),
    h: Number(quote?.high?.[index]),
    l: Number(quote?.low?.[index]),
    c: Number(quote?.close?.[index]),
    v: Number(quote?.volume?.[index]) || 0
  })).filter((candle) => [candle.t, candle.o, candle.h, candle.l, candle.c].every(Number.isFinite));

  if (candles.length < 1_000) throw new Error(`${symbol}: only ${candles.length} valid daily candles`);
  return candles;
}

async function main() {
  for (const symbol of symbols) {
    const candles = await fetchDailyCandles(symbol);
    await client.send(new PutCommand({
      TableName: tableName,
      Item: {
        [partitionKey]: `daily-history#${symbol}`,
        cachedAt: new Date().toISOString(),
        source: "yahoo",
        candles
      }
    }));
    console.log(`${symbol}: stored ${candles.length} daily candles`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
