#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
OUTPUT_DIR="$ROOT/outputs/native-smoke"
APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="life.copa.app"
ACTIVITY="$PACKAGE/.MainActivity"

mkdir -p "$OUTPUT_DIR"
cd "$ANDROID_DIR"
chmod +x gradlew

./gradlew :app:assembleDebug :app:connectedDebugAndroidTest --no-daemon
test -f "$APK"

adb install -r "$APK"
adb logcat -c
adb shell am force-stop "$PACKAGE"

start_output="$(adb shell am start -W -n "$ACTIVITY")"
printf '%s\n' "$start_output"
grep -q "Status: ok" <<<"$start_output"

sleep 8
pid="$(adb shell pidof "$PACKAGE" | tr -d '\r')"
test -n "$pid"

focus="$(adb shell dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp' || true)"
printf '%s\n' "$focus"
grep -q "$PACKAGE" <<<"$focus"

adb exec-out screencap -p > "$OUTPUT_DIR/launch.png"
adb logcat -d -t 1200 > "$OUTPUT_DIR/logcat.txt"

if grep -E "FATAL EXCEPTION|ANR in ${PACKAGE}|Process: ${PACKAGE}.*has died" "$OUTPUT_DIR/logcat.txt"; then
  echo "Native Android smoke test detected a crash or ANR" >&2
  exit 1
fi

printf 'package=%s\npid=%s\nactivity=%s\n' "$PACKAGE" "$pid" "$ACTIVITY" > "$OUTPUT_DIR/result.txt"
echo "Native Android smoke test passed for $PACKAGE (pid $pid)"
