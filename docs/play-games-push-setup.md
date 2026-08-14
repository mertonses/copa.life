# Copa Life Play Games + push setup

The Android client is wired for Play Games Services v2 and Capacitor Push Notifications.

Before production upload:

1. Finish the Play Games Services project in Play Console and copy its numeric project id into `android/app/src/main/res/values/strings.xml`.
2. Create the ten achievements from `docs/play-games-achievements.csv`, add Turkish/English localizations, and replace the empty IDs in `src/runtime/copaPlayGames.js` with the generated resource IDs.
3. Add the Play Games test account and publish the achievements only after internal-track verification.
4. Firebase project `copa-life` and Android app `life.copa.app` are configured. The generated `android/app/google-services.json` is wired to the Firebase app and the repository intentionally contains no Firebase private key or sender credential.
5. Store push tokens received through the `copa:push-token` event only after the player grants notification permission. Send them to a server endpoint with authenticated, rate-limited writes; never put an FCM credential in the app.

The app remains usable without Play Games, Firebase, notification permission, or network access. The ten Play Games achievement IDs are now wired in `src/runtime/copaPlayGames.js`; Play Console credential linking and server-side FCM sending remain deployment-console steps.
