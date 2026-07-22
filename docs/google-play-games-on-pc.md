# copa.life — Google Play Games on PC release pack

Updated: 2026-07-22

## Implemented baseline

- The game remains portrait-first, which Google explicitly supports for games that play best in portrait mode.
- Touchscreen is declared optional; mouse compatibility mode can operate every gameplay action.
- `MainActivity` is resizable and already handles orientation, screen-size, smallest-screen-size, density, keyboard and navigation changes without restarting the run.
- The web UI has responsive breakpoints, large-screen layouts, mouse-wheel scrolling, keyboard focus states and keyboard shortcuts.
- The manifest requests only internet and advertising ID access, neither of which blocks PC gameplay.
- The Android game has no required camera, telephony, GPS, accelerometer, Bluetooth or touch-only hardware dependency.
- ARM packages are accepted by Google Play Games on PC. x86-64 remains a recommendation, not a release requirement; this project contains no first-party native game library that needs a separate ABI port.

Run the automated gate with:

```powershell
npm run check:play-games-pc
```

## Required Play Console actions

1. Upload the signed, production-AdMob AAB to the existing closed test track.
2. In **Reach and devices → Advanced settings → Form factors**, opt in to **Google Play Games on PC** if the option is shown for the account.
3. Keep the same countries and tester Google Group/email list as the Android closed test. Test links can take several hours to propagate.
4. Review the automated device-catalog result for PC compatibility and resolve any Play Console declaration warning before rollout.
5. Install Google Play Games on PC with a tester Google account, join the closed-test link, then install copa.life from the PC client.
6. Record one uninterrupted full run in windowed mode and one in full screen. Verify mouse click, wheel scrolling, keyboard focus, ad dismissal, app resume, result/new-run transition and persisted recovery after closing the window.
7. If this is a personal developer account created after 2023-11-13, keep at least 12 testers opted in continuously for 14 days before requesting production access.

## Developer-emulator acceptance matrix

Use the Google Play Games on PC Developer Emulator for sideload checks before store propagation:

- 1280×720 windowed, 1920×1080 full screen, and 3840×2160 simulated display.
- Mouse-only full run; wheel scrolling on the hub and draw carousel.
- Keyboard: Tab/Shift+Tab focus order, Enter/Space activation, Escape close/back behavior.
- Rewarded ads: cancel and completion paths for draft, injury and market; never grant a reward on cancel/failure.
- Network offline at cold start and during ad load; gameplay remains usable and retry messages stay visible.
- Resize/minimize/restore during draw, match and reward screens; no lost run or duplicate reward.

For 4K display simulation:

```powershell
adb shell wm size 3840x2160
adb shell wm size reset
```

## Material checklist

- Signed production AAB and release manifest generated from the same clean commit.
- Localized phone screenshots, feature graphic and listing copy for `tr-TR`, `en-US`, `de-DE`, `es-ES`, `it-IT`.
- Closed-test release notes for the same five locales.
- Tester instructions covering opt-in, PC install, ad test cases and feedback template.

Official references:

- https://developer.android.com/games/playgames/start
- https://developer.android.com/games/playgames/graphics
- https://support.google.com/googleplay/android-developer/answer/9845334
- https://support.google.com/googleplay/android-developer/answer/14151465
