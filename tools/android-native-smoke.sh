#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
OUTPUT_DIR="$ROOT/outputs/native-smoke"
APK="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="life.copa.app"
ACTIVITY="$PACKAGE/.MainActivity"

mkdir -p "$OUTPUT_DIR"
capture_diagnostics() {
  timeout 10s adb exec-out screencap -p > "$OUTPUT_DIR/launch.png" 2>/dev/null || true
  timeout 10s adb logcat -d -t 1200 > "$OUTPUT_DIR/logcat.txt" 2>/dev/null || true
}

has_app_crash() {
  local log_file="$1"

  if grep -Eq "ANR in ${PACKAGE}|Fatal signal.*${PACKAGE}" "$log_file"; then
    return 0
  fi

  awk -v process_marker="Process: ${PACKAGE}" '
    /FATAL EXCEPTION/ { remaining = 12 }
    remaining > 0 {
      if (index($0, process_marker)) {
        found = 1
      }
      remaining--
    }
    END { exit(found ? 0 : 1) }
  ' "$log_file"
}

launch_and_assert_foreground() {
  local start_output
  local focus

  timeout 15s adb shell am force-stop "$PACKAGE" >/dev/null 2>&1 || return 1
  start_output="$(timeout 30s adb shell am start -W -n "$ACTIVITY" 2>&1)" || {
    printf '%s\n' "$start_output" >&2
    return 1
  }
  printf '%s\n' "$start_output"
  grep -q "Status: ok" <<<"$start_output" || return 1

  sleep 8
  pid="$(timeout 10s adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r')" || pid=""
  if [[ -z "$pid" ]]; then
    echo "Android smoke launch ended before the foreground assertion" >&2
    return 1
  fi

  focus="$(timeout 10s adb shell dumpsys activity activities 2>/dev/null | grep -E 'mResumedActivity|topResumedActivity|ResumedActivity' || true)"
  if ! grep -q "$PACKAGE" <<<"$focus"; then
    focus="$(timeout 10s adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus|mFocusedApp' || true)"
  fi
  printf '%s\n' "$focus"
  grep -q "$PACKAGE" <<<"$focus"
}
trap capture_diagnostics EXIT

cd "$ANDROID_DIR"
chmod +x gradlew

./gradlew :app:assembleDebug :app:connectedDebugAndroidTest --no-daemon
test -f "$APK"

timeout 90s adb install -r "$APK"
# A package install wakes Play services and package-indexing work on a fresh AVD.
# Let those broadcasts drain before measuring the application's cold-start focus.
timeout 15s adb shell am wait-for-broadcast-idle >/dev/null 2>&1 || true
sleep 5
timeout 10s adb logcat -c || true

pid=""
for attempt in 1 2; do
  if launch_and_assert_foreground; then
    break
  fi

  timeout 10s adb logcat -d -t 1200 > "$OUTPUT_DIR/logcat.txt" 2>/dev/null || true
  if has_app_crash "$OUTPUT_DIR/logcat.txt"; then
    echo "Native Android smoke test detected an app crash or ANR" >&2
    exit 1
  fi

  if [[ "$attempt" -eq 2 ]]; then
    echo "Native Android smoke test could not keep the app in the foreground" >&2
    exit 1
  fi

  echo "Transient emulator service restart detected; retrying the app launch once" >&2
  sleep 5
done

capture_diagnostics

if has_app_crash "$OUTPUT_DIR/logcat.txt"; then
  echo "Native Android smoke test detected an app crash or ANR" >&2
  exit 1
fi

printf 'package=%s\npid=%s\nactivity=%s\n' "$PACKAGE" "$pid" "$ACTIVITY" > "$OUTPUT_DIR/result.txt"
trap - EXIT
echo "Native Android smoke test passed for $PACKAGE (pid $pid)"
