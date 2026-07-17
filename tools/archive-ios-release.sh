#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[[ "$(uname -s)" == "Darwin" ]] || { echo "iOS archives require macOS."; exit 1; }
[[ -n "${APPLE_TEAM_ID:-}" ]] || { echo "Set APPLE_TEAM_ID to the Apple Developer Team ID."; exit 1; }
[[ "$(git branch --show-current)" == "main" ]] || { echo "Store archives must be produced from main."; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Store archives require a clean worktree."; exit 1; }

npm run ios:doctor
npm run ios:sync
npm test
npm run check --prefix services/ghost-club-api
npm run test:ci --prefix playtest/runner
rm -rf outputs/copa-life.xcarchive
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath outputs/copa-life.xcarchive \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  archive
echo "Archive ready: outputs/copa-life.xcarchive"
