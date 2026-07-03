$GODOT = "C:\Users\pc\Downloads\Godot_v4.7-stable_win64.exe\Godot_v4.7-stable_win64.exe"
$PROJECT = "$PSScriptRoot\godot-final-sim"
$OUT = "$PROJECT\index.html"

Write-Host "Exporting Godot sim..." -ForegroundColor Cyan
& $GODOT --headless --path $PROJECT --export-release "Web" $OUT 2>&1

if (Test-Path $OUT) {
    Write-Host "OK: $OUT" -ForegroundColor Green
} else {
    Write-Host "FAILED: $OUT bulunamadi" -ForegroundColor Red
    exit 1
}
