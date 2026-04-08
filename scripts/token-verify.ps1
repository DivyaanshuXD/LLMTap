$srcPath = 'c:\Users\prave\Desktop\llmtap\packages\dashboard\src'
$patterns = @('#66FCF1','#45A29E','#C5C6C7','#0B0C10','#1F2833','#66fcf1','#45a29e','#c5c6c7','#0b0c10','#1f2833')
$tsxTotal = 0
$cssTotal = 0

foreach ($pat in $patterns) {
    $tsxHits = Get-ChildItem -Path $srcPath -Recurse -Include '*.tsx','*.ts' |
               Select-String -Pattern ([regex]::Escape($pat)) -CaseSensitive
    $cssHits = Get-ChildItem -Path $srcPath -Recurse -Include '*.css' |
               Select-String -Pattern ([regex]::Escape($pat)) -CaseSensitive

    foreach ($h in $tsxHits) {
        Write-Host "TSX/TS [$pat] $($h.Filename):$($h.LineNumber): $($h.Line.Trim())"
        $tsxTotal++
    }
    foreach ($h in $cssHits) {
        Write-Host "CSS    [$pat] $($h.Filename):$($h.LineNumber): $($h.Line.Trim())"
        $cssTotal++
    }
}

Write-Host ""
Write-Host "TSX/TS remaining: $tsxTotal  (expected: 0)"
Write-Host "CSS remaining:    $cssTotal  (expected: only :root / .dark definition lines)"

if ($tsxTotal -eq 0) {
    Write-Host "PASS: All TSX/TS files are clean."
} else {
    Write-Host "FAIL: $tsxTotal TSX/TS hits need fixing."
}
