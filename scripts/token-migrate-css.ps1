$cssFile = 'c:\Users\prave\Desktop\llmtap\packages\dashboard\src\index.css'
$enc = [System.Text.UTF8Encoding]::new($false)
$orig = [System.IO.File]::ReadAllText($cssFile, $enc)
$c = $orig

$c = $c -replace 'rgba\(102,\s*252,\s*241,\s*([\d.]+)\)', 'rgba(var(--ch-accent), $1)'
$c = $c -replace 'rgba\(69,\s*162,\s*158,\s*([\d.]+)\)',  'rgba(var(--ch-accent-2), $1)'
$c = $c -replace 'rgba\(197,\s*198,\s*199,\s*([\d.]+)\)', 'rgba(var(--ch-text-primary), $1)'

if ($c -ne $orig) {
    [System.IO.File]::WriteAllText($cssFile, $c, $enc)
    Write-Host "CSS updated."
} else {
    Write-Host "No changes needed in CSS."
}
