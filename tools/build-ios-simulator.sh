#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[[ "$(uname -s)" == "Darwin" ]] || { echo "iOS simulator builds require macOS."; exit 1; }
npm run ios:doctor
npm run ios:sync
npm run check:ios:readiness
rm -rf outputs/ios-derived
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath outputs/ios-derived \
  CODE_SIGNING_ALLOWED=NO \
  build
echo "Simulator app: outputs/ios-derived/Build/Products/Debug-iphonesimulator/App.app"
