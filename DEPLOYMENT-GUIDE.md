# Market Analysis Deployment Guide

This guide connects the project to Supabase, Render, MT5, and GitHub Pages.

## 1. Supabase

Open the [Supabase Dashboard](https://supabase.com/dashboard).

1. Select your organization.
2. Click **New project**.
3. Create the project and wait until it is ready.
4. Open **SQL Editor**.
5. Open [`supabase/schema.sql`](supabase/schema.sql) in GitHub:
   [Open schema.sql](https://github.com/dtrans2022/Market-Analysis/blob/main/supabase/schema.sql)
6. Copy the SQL and paste it into a new Supabase SQL query.
7. Click **Run**.

`Success. No rows returned` means the SQL ran successfully. The SQL creates the `mt5_snapshots` table.

Check it under **Table Editor -> mt5_snapshots**.

### Supabase values for Render

Open **Project Settings -> API** and copy:

- Project URL
- `service_role` key

Never put the `service_role` key into the mobile app, frontend, GitHub, or chat.

The Supabase database password is not needed by this application. The API uses the Project URL and service-role key through Render environment variables.

## 2. Render API service

Open the [Render Dashboard](https://dashboard.render.com/).

If **Workspace -> Your services** is empty, that is expected. Create the service:

1. Click **New +**.
2. Select **Blueprint**.
3. Connect GitHub.
4. Select `dtrans2022/Market-Analysis`.
5. Select the `main` branch.
6. Click **Apply** or **Create Blueprint**.

Render reads [`render.yaml`](render.yaml) and creates:

```text
market-analysis-api
```

After deployment, Render provides a URL similar to:

```text
https://market-analysis-api.onrender.com
```

Test it:

```text
https://your-render-url.onrender.com/health
```

Expected response:

```json
{"status":"ok"}
```

## 3. Render environment variables

Open the Render service -> **Environment** and add:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
MT4_SNAPSHOT_API_KEY=create-a-private-random-key
ALLOWED_ORIGIN=https://srikanth140611.github.io
```

Also add these if they are available:

```text
FINNHUB_API_KEY=your_finnhub_key
MARKETAUX_API_KEY=your_marketaux_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
SLACK_WEBHOOK_URL=your_slack_webhook
```

After saving variables, use **Manual Deploy -> Deploy latest commit**.

## 4. Configure MT5

In MT5, open:

**Tools -> Options -> Expert Advisors**

Enable **Allow WebRequest for listed URL** and add only the Render base URL:

```text
https://your-render-url.onrender.com
```

Attach the EA from:

```text
scripts/mt5-demo-snapshot-ea.mq5
```

In the EA input settings, use:

```text
ApiUrl=https://your-render-url.onrender.com/api/mt4/snapshot
ApiKey=the-same-value-as-MT4_SNAPSHOT_API_KEY
```

Enable **Algo Trading**.

The EA should send snapshots automatically every few seconds.

Test the quote endpoint:

```text
https://your-render-url.onrender.com/api/mt4/quotes
```

The first successful response should contain:

```json
{
  "source": "mt4",
  "healthStatus": "fresh",
  "quotes": []
}
```

The `quotes` array should contain live MT5 bid/ask prices. Supabase should then show a row with:

```text
snapshot_key = latest
```

## 5. MT5 fallback behavior

The API uses this order:

1. Fresh MT5 broker snapshot.
2. Yahoo Finance live quotes if MT5 is stale or offline.
3. ExchangeRate-API if Yahoo Finance is unavailable.
4. The last persisted MT5 snapshot from Supabase if the Render process restarted.

When fallback is active, `/api/mt4/quotes` reports:

```json
{
  "source": "api-fallback",
  "healthStatus": "fresh"
}
```

The UI also displays the current source and provider.

## 6. GitHub Pages frontend

The frontend must use the Render API URL during its web build.

From PowerShell:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_BASE_URL="https://your-render-url.onrender.com"
npm run deploy:gh-pages
```

Replace `your-render-url` with the actual Render hostname.

Open the published app at:

```text
https://dtrans2022.github.io/Market-Analysis/
```

If the frontend still shows an old version, use **Ctrl + F5** or open it in a private window.

## 7. Troubleshooting

### Render service is missing

Use **New + -> Blueprint**, not **Web Service**, and select the repository containing `render.yaml`.

### Render cannot see the repository

Reconnect GitHub in Render under connected accounts and confirm the `dtrans2022/Market-Analysis` repository is authorized.

### MT5 returns 401

The EA `ApiKey` and Render `MT4_SNAPSHOT_API_KEY` values do not match.

### MT5 returns 503

Check Render logs, confirm the Render service is running, and verify the MT5 WebRequest allow-list URL.

### Supabase table remains empty

The MT5 EA has not successfully posted a snapshot yet. Check the EA Experts/Journal log and test the Render `/api/mt4/quotes` endpoint.

### Render free service is slow on first request

Free Render services may sleep when idle. The first request can take several seconds while the service wakes up.
