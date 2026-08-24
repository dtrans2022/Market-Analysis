# Publish Market Analysis on Google Play Store

This guide explains how to build and publish the Expo mobile app in this repository.

## What you need

- Google account
- Google Play Console account: https://play.google.com/console
- Expo account: https://expo.dev/signup
- Android phone for testing
- Privacy policy URL
- App screenshots and icon

Google Play Console usually requires a one-time developer registration fee.

## 1. Confirm the app settings

The Android application ID is configured in [`mobile/app.json`](mobile/app.json):

```text
com.marketanalysis.app
```

This ID must be unique on Google Play. Do not change it after publishing the first release.

The EAS build profiles are configured in [`mobile/eas.json`](mobile/eas.json).

## 2. Confirm the production API

The app uses the Render API:

```text
https://market-analysis-hxan.onrender.com
```

The Android app does not connect directly to MT5. The data flow is:

```text
MT5 EA -> Render API -> Supabase
                    -> Android app
```

Keep Supabase service-role credentials only in Render. Never place them in the Android app.

## 3. Install dependencies and sign in

Open PowerShell at the project root:

```powershell
cd mobile
npm install
npx eas login
```

Check the Expo project:

```powershell
npx eas project:info
```

## 4. Build a test APK

Create an internal testing build:

```powershell
npx eas build --platform android --profile preview
```

When EAS asks about Android signing credentials, allow EAS to create and manage them.

Download the generated APK from the EAS build page and install it on an Android device.

Test:

- Global market updates
- Trends
- History
- Analysis Agents
- MT5 quote status
- API fallback quotes
- Best Shares
- Slack settings

## 5. Create the Google Play app

Open https://play.google.com/console.

1. Create a developer account.
2. Click **Create app**.
3. App name: `Market Analysis`.
4. Select the default language.
5. Select **App**.
6. Select **Free** unless the app will be paid.
7. Accept the declarations.
8. Click **Create app**.

## 6. Prepare the store listing

In Google Play Console, complete the store listing:

- App name
- Short description
- Full description
- App icon
- Feature graphic
- Phone screenshots
- Category
- Contact email
- Privacy policy URL

The privacy policy should explain that the app displays market data and may process MT5 account information such as quotes, balance, equity, positions, and orders.

## 7. Complete policy forms

Complete these sections in Google Play Console:

- App content
- Data safety
- Content rating
- Target audience
- Ads declaration
- App access

If the app requires login or special access, provide Google Play reviewers with test instructions.

## 8. Build the production Android App Bundle

From PowerShell:

```powershell
cd mobile
npx eas build --platform android --profile production
```

This creates an Android App Bundle with the `.aab` extension. Google Play requires an App Bundle for new apps.

The production profile uses automatic version incrementing from [`mobile/eas.json`](mobile/eas.json).

## 9. Upload for internal testing

In Google Play Console:

1. Open **Testing -> Internal testing**.
2. Create a tester list.
3. Create a new release.
4. Upload the production `.aab` file.
5. Add release notes.
6. Save and review the release.
7. Start the internal rollout.
8. Open the tester opt-in link on the Android device.
9. Install and test the Play Store version.

## 10. Publish to production

After internal testing:

1. Open **Production** in Google Play Console.
2. Create a new release or promote the tested release.
3. Review all warnings.
4. Submit the release for review.
5. Wait for Google approval.

Google may require a closed test before production access, depending on the developer account type and current Play Console rules.

## Optional EAS submission

You can submit through EAS after configuring Google Play service credentials:

```powershell
cd mobile
npx eas submit --platform android --profile production
```

Manual upload in Google Play Console is usually easier for the first release.

## Updating the app later

Increase the version in [`mobile/app.json`](mobile/app.json), for example:

```json
"version": "1.0.1"
```

Then build again:

```powershell
cd mobile
npx eas build --platform android --profile production
```

Upload the new `.aab` to Google Play Console. The version code must always increase.

## Troubleshooting

### EAS login fails

Open https://expo.dev and confirm the Expo account is active, then run:

```powershell
npx eas login
```

### App cannot reach the API

Check that Render is running:

```text
https://market-analysis-hxan.onrender.com/health
```

Expected response:

```json
{"status":"ok"}
```

### MT5 shows offline

The Android app reads MT5 data through Render. Verify the MT5 EA is sending snapshots to:

```text
https://market-analysis-hxan.onrender.com/api/mt4/snapshot
```

### Google rejects the upload

Check that:

- The package ID is `com.marketanalysis.app`.
- The version code is higher than the previous release.
- The `.aab` was built with the production profile.
- The Data Safety and privacy policy forms are complete.

## Main production command

```powershell
cd mobile
npx eas build --platform android --profile production
```
