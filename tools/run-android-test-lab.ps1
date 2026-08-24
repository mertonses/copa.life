param(
  [string]$Project = "copa-life",
  [string]$Model = "a34x",
  [string]$Version = "36",
  [ValidateSet("portrait", "landscape")]
  [string]$Orientation = "portrait",
  [string]$Locale = "tr"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$android = Join-Path $root "android"
$appApk = Join-Path $android "app\build\outputs\apk\debug\app-debug.apk"
$testApk = Join-Path $android "app\build\outputs\apk\androidTest\debug\app-debug-androidTest.apk"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI bulunamadı. Firebase Test Lab için Google Cloud CLI gerekli."
}

Push-Location $android
try {
  & ".\gradlew.bat" ":app:assembleDebug" ":app:assembleDebugAndroidTest" "--no-daemon"
  if ($LASTEXITCODE -ne 0) { throw "Android instrumentation APK derlemesi başarısız." }
} finally {
  Pop-Location
}

& gcloud config set project $Project | Out-Null
& gcloud firebase test android run `
  --type instrumentation `
  --app $appApk `
  --test $testApk `
  --device "model=$Model,version=$Version,locale=$Locale,orientation=$Orientation" `
  --timeout 15m `
  --use-orchestrator `
  --num-flaky-test-attempts=0 `
  --results-history-name "copa-life-android-quality"

if ($LASTEXITCODE -ne 0) { throw "Firebase Test Lab fiziksel cihaz matrisi başarısız." }
