param(
    [string]$InputAab = (Join-Path $PSScriptRoot "..\android\app\build\outputs\bundle\release\app-release.aab"),
    [string]$OutputAab = (Join-Path $PSScriptRoot "..\android\app\build\outputs\bundle\release\app-release-signed.aab"),
    [string]$KeyStore = (Join-Path $env:USERPROFILE ".copa-life\signing\copa-life-upload.jks"),
    [string]$SecretFile = (Join-Path $env:USERPROFILE ".copa-life\signing\upload-password.dpapi"),
    [string]$Alias = "copa-life-upload"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

function Find-JavaTool([string]$Name) {
    if ($env:JAVA_HOME) {
        $candidate = Join-Path $env:JAVA_HOME "bin\$Name.exe"
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }

    $candidate = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE ".codex\tools") `
        -Recurse -Filter "$Name.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "jdk-21" } |
        Select-Object -First 1 -ExpandProperty FullName

    if (-not $candidate) { throw "$Name.exe için JDK 21 bulunamadı." }
    return $candidate
}

if (-not (Test-Path -LiteralPath $InputAab)) { throw "İmzalanacak AAB bulunamadı: $InputAab" }
if (-not (Test-Path -LiteralPath $KeyStore)) { throw "Yükleme anahtarı bulunamadı: $KeyStore" }
if (-not (Test-Path -LiteralPath $SecretFile)) { throw "Şifreli parola dosyası bulunamadı: $SecretFile" }

$jarsigner = Find-JavaTool "jarsigner"
$encrypted = [IO.File]::ReadAllBytes($SecretFile)
$plainBytes = $null
$password = $null

try {
    $plainBytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $encrypted,
        $null,
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $password = [Text.Encoding]::UTF8.GetString($plainBytes)

    $outputDirectory = Split-Path -Parent $OutputAab
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    if (Test-Path -LiteralPath $OutputAab) { Remove-Item -LiteralPath $OutputAab -Force }

    & $jarsigner `
        -sigalg SHA256withRSA `
        -digestalg SHA-256 `
        -keystore $KeyStore `
        -storepass $password `
        -keypass $password `
        -signedjar $OutputAab `
        $InputAab `
        $Alias
    if ($LASTEXITCODE -ne 0) { throw "AAB imzalama başarısız oldu." }

    # Play upload keys are expected to use a self-signed certificate. Using
    # -strict would turn that expected certificate warning into a non-zero exit.
    & $jarsigner -verify -verbose -certs $OutputAab | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Signed AAB could not be verified." }

    $hash = (Get-FileHash -LiteralPath $OutputAab -Algorithm SHA256).Hash
    [pscustomobject]@{
        SignedAab = (Resolve-Path -LiteralPath $OutputAab).Path
        Sha256 = $hash
        Bytes = (Get-Item -LiteralPath $OutputAab).Length
        Alias = $Alias
    }
}
finally {
    if ($plainBytes) { [Array]::Clear($plainBytes, 0, $plainBytes.Length) }
    $password = $null
    Remove-Variable password -ErrorAction SilentlyContinue
}
