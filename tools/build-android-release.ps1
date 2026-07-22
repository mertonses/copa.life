param([switch]$AllowDirty)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

function Find-JdkHome {
    if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        return $env:JAVA_HOME
    }
    $java = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE ".codex\tools") `
        -Recurse -Filter "java.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "jdk-21" } |
        Select-Object -First 1
    if (-not $java) { throw "JDK 21 was not found. Set JAVA_HOME before building." }
    return (Split-Path -Parent (Split-Path -Parent $java.FullName))
}

Push-Location $Root
try {
    if (-not $AllowDirty) {
        if ($env:COPA_ADMOB_APP_ID -notmatch '^ca-app-pub-\d{16}~\d{10}$' -or $env:COPA_ADMOB_APP_ID -eq 'ca-app-pub-3940256099942544~3347511713') {
            throw "Set COPA_ADMOB_APP_ID to the production AdMob app ID before building a Play release."
        }
        if ($env:COPA_ADMOB_INTERSTITIAL_ID -notmatch '^ca-app-pub-\d{16}/\d{10}$' -or $env:COPA_ADMOB_INTERSTITIAL_ID -eq 'ca-app-pub-3940256099942544/1033173712') {
            throw "Set COPA_ADMOB_INTERSTITIAL_ID to the production run-end interstitial unit ID before building a Play release."
        }
        if ($env:COPA_ADMOB_REWARDED_ID -notmatch '^ca-app-pub-\d{16}/\d{10}$' -or $env:COPA_ADMOB_REWARDED_ID -eq 'ca-app-pub-3940256099942544/5224354917') {
            throw "Set COPA_ADMOB_REWARDED_ID to the production rewarded unit ID before building a Play release."
        }
    }
    $env:JAVA_HOME = Find-JdkHome
    if (-not $env:ANDROID_HOME) {
        $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    }
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

    $doctorArgs = @("tools/android-doctor.mjs", "--release")
    if ($AllowDirty) { $doctorArgs += "--allow-dirty" }
    Invoke-Checked "node" $doctorArgs

    Invoke-Checked "npm" @("ci")
    Invoke-Checked "npm" @("ci", "--prefix", "services/ghost-club-api")
    Invoke-Checked "npm" @("ci", "--prefix", "playtest/runner")

    Invoke-Checked "npm" @("run", "android:version:check")
    Invoke-Checked "npm" @("run", "check:android:release")
    Invoke-Checked "npm" @("run", "audit:security")
    Invoke-Checked "npm" @("test")
    Invoke-Checked "npm" @("run", "check", "--prefix", "services/ghost-club-api")
    Invoke-Checked "npx" @("--prefix", "playtest/runner", "playwright", "install", "chromium")
    Invoke-Checked "npm" @("run", "test:ci", "--prefix", "playtest/runner")
    Invoke-Checked "npm" @("run", "check:parity")
    Invoke-Checked "npm" @("run", "android:sync")

    Push-Location (Join-Path $Root "android")
    try {
        Invoke-Checked ".\gradlew.bat" @("clean", ":app:bundleRelease", "--no-daemon")
    }
    finally {
        Pop-Location
    }

    Invoke-Checked (Join-Path $env:JAVA_HOME "bin\java.exe") @(
        "tools/CheckAndroidAab.java",
        "android/app/build/outputs/bundle/release/app-release.aab"
    )

    Invoke-Checked "powershell" @(
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $Root "tools\sign-android-release.ps1")
    )
    Invoke-Checked (Join-Path $env:JAVA_HOME "bin\java.exe") @(
        "tools/CheckAndroidAab.java",
        "android/app/build/outputs/bundle/release/app-release-signed.aab"
    )
    Invoke-Checked "node" @(
        "tools/check-android-signature.mjs",
        "android/app/build/outputs/bundle/release/app-release-signed.aab"
    )
    Invoke-Checked "node" @(
        "tools/write-android-release-manifest.mjs",
        "android/app/build/outputs/bundle/release/app-release-signed.aab",
        "--verified"
    )

    Write-Host "Android release candidate is ready. Run a physical-device smoke test before Play promotion."
}
finally {
    Pop-Location
}
