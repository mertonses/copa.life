param(
  [ValidateSet("doctor","baseline","one","eight","survival")]
  [string]$Phase = "doctor",
  [ValidateRange(10,60)]
  [int]$DurationSeconds = 30,
  [string]$Package = "life.copa.app"
)

$ErrorActionPreference = "Stop"

function Find-Adb {
  $candidates = @()
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
  if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe") }
  $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return (Resolve-Path -LiteralPath $candidate).Path }
  }
  $command = Get-Command adb -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  throw "adb bulunamadi. Android SDK platform-tools kurulumu gerekli."
}

function Invoke-Adb {
  param([string[]]$Arguments)
  $output = & $script:Adb @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "adb $($Arguments -join ' ') basarisiz: $output" }
  return ($output -join "`n")
}

function Read-Pid {
  $value = (Invoke-Adb -Arguments @("shell","pidof",$Package)).Trim()
  if (-not $value) { return $null }
  return ($value -split "\s+")[0]
}

function Parse-FirstNumber {
  param([string]$Text,[string]$Pattern)
  $match = [regex]::Match($Text,$Pattern,[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $match.Success) { return $null }
  return [double]$match.Groups[1].Value
}

$script:Adb = Find-Adb
$devices = Invoke-Adb -Arguments @("devices")
$connected = @($devices -split "`r?`n" | Where-Object { $_ -match "\sdevice$" })
if ($connected.Count -ne 1) {
  throw "Tam olarak bir fiziksel Android cihaz bagli olmali. Bulunan: $($connected.Count)"
}

$model = (Invoke-Adb -Arguments @("shell","getprop","ro.product.model")).Trim()
$sdk = (Invoke-Adb -Arguments @("shell","getprop","ro.build.version.sdk")).Trim()
$device = (Invoke-Adb -Arguments @("shell","getprop","ro.product.device")).Trim()
$isEmulator = (Invoke-Adb -Arguments @("shell","getprop","ro.kernel.qemu")).Trim()
if ($isEmulator -eq "1" -or $device -match "emulator|generic") {
  throw "Bu performans kapisi emulatorde kabul vermez; fiziksel Android cihaz baglanmali."
}
$installed = Invoke-Adb -Arguments @("shell","pm","path",$Package)
if ($installed -notmatch "package:") { throw "$Package cihazda kurulu degil." }

if ($Phase -eq "doctor") {
  Write-Output "Physical gate ready: $model ($device), Android API $sdk, package $Package"
  exit 0
}

$root = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "outputs\android-physical-gate"
New-Item -ItemType Directory -Force -Path $root | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$prefix = Join-Path $root "$stamp-$Phase"

$pidBefore = Read-Pid
if (-not $pidBefore) { throw "$Package calismiyor. Uygulamayi acip ilgili Final Sim ekranina gel." }

$batteryBefore = Invoke-Adb -Arguments @("shell","dumpsys","battery")
$memoryBefore = Invoke-Adb -Arguments @("shell","dumpsys","meminfo",$Package)
Invoke-Adb -Arguments @("shell","dumpsys","gfxinfo",$Package,"reset") | Out-Null

$speedLabel = "istenen"
if ($Phase -eq "one") { $speedLabel = "1x" }
if ($Phase -eq "eight") { $speedLabel = "8x" }
Write-Output "$Phase olcumu basladi: $DurationSeconds saniye. Bu sure boyunca Final Sim'i $speedLabel hizda calistir."
Start-Sleep -Seconds $DurationSeconds

$pidAfter = Read-Pid
$batteryAfter = Invoke-Adb -Arguments @("shell","dumpsys","battery")
$memoryAfter = Invoke-Adb -Arguments @("shell","dumpsys","meminfo",$Package)
$gfx = Invoke-Adb -Arguments @("shell","dumpsys","gfxinfo",$Package)
$logcat = Invoke-Adb -Arguments @("logcat","-d","-t","600","AndroidRuntime:E","chromium:E","Capacitor:W","*:S")

$temperatureBefore = Parse-FirstNumber -Text $batteryBefore -Pattern "temperature:\s*(\d+)"
$temperatureAfter = Parse-FirstNumber -Text $batteryAfter -Pattern "temperature:\s*(\d+)"
$totalPssBefore = Parse-FirstNumber -Text $memoryBefore -Pattern "TOTAL\s+(\d+)"
$totalPssAfter = Parse-FirstNumber -Text $memoryAfter -Pattern "TOTAL\s+(\d+)"
$janky = Parse-FirstNumber -Text $gfx -Pattern "Janky frames:\s*(\d+)"
$frames = Parse-FirstNumber -Text $gfx -Pattern "Total frames rendered:\s*(\d+)"

$summary = [ordered]@{
  measuredAt = (Get-Date).ToString("o")
  phase = $Phase
  durationSeconds = $DurationSeconds
  package = $Package
  model = $model
  device = $device
  androidApi = $sdk
  pidBefore = $pidBefore
  pidAfter = $pidAfter
  processSurvived = [bool]($pidBefore -and $pidAfter -and $pidBefore -eq $pidAfter)
  temperatureBeforeC = if ($null -ne $temperatureBefore) { $temperatureBefore / 10 } else { $null }
  temperatureAfterC = if ($null -ne $temperatureAfter) { $temperatureAfter / 10 } else { $null }
  totalPssBeforeKb = $totalPssBefore
  totalPssAfterKb = $totalPssAfter
  totalFrames = $frames
  jankyFrames = $janky
  jankyRate = if ($frames -and $null -ne $janky) { [math]::Round($janky / $frames,4) } else { $null }
}

$summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath "$prefix-summary.json" -Encoding UTF8
$batteryBefore | Set-Content -LiteralPath "$prefix-battery-before.txt" -Encoding UTF8
$batteryAfter | Set-Content -LiteralPath "$prefix-battery-after.txt" -Encoding UTF8
$memoryBefore | Set-Content -LiteralPath "$prefix-memory-before.txt" -Encoding UTF8
$memoryAfter | Set-Content -LiteralPath "$prefix-memory-after.txt" -Encoding UTF8
$gfx | Set-Content -LiteralPath "$prefix-gfxinfo.txt" -Encoding UTF8
$logcat | Set-Content -LiteralPath "$prefix-logcat.txt" -Encoding UTF8

$summary | Format-List
Write-Output "Rapor: $prefix-summary.json"
