$srcPath = 'c:\Users\prave\Desktop\llmtap\packages\dashboard\src'
$enc = [System.Text.UTF8Encoding]::new($false)
$files = Get-ChildItem -Path $srcPath -Recurse -Include '*.tsx','*.ts' |
         Where-Object { $_.FullName -notlike '*node_modules*' }

$count = 0
foreach ($file in $files) {
    $orig = [System.IO.File]::ReadAllText($file.FullName, $enc)
    $c = $orig

    $c = $c -replace '\[#66FCF1\]/([0-9]+)', '[var(--color-accent)]/$1'
    $c = $c -replace '\[#45A29E\]/([0-9]+)', '[var(--color-accent-2)]/$1'
    $c = $c -replace '\[#C5C6C7\]/([0-9]+)', '[var(--color-text-primary)]/$1'
    $c = $c -replace '\[#0B0C10\]/([0-9]+)', '[var(--color-bg-base)]/$1'
    $c = $c -replace '\[#1F2833\]/([0-9]+)', '[var(--color-bg-panel)]/$1'

    $c = $c -replace '#66FCF1', 'var(--color-accent)'
    $c = $c -replace '#45A29E', 'var(--color-accent-2)'
    $c = $c -replace '#C5C6C7', 'var(--color-text-primary)'
    $c = $c -replace '#0B0C10', 'var(--color-bg-base)'
    $c = $c -replace '#1F2833', 'var(--color-bg-panel)'

    $c = $c -replace '#66fcf1', 'var(--color-accent)'
    $c = $c -replace '#45a29e', 'var(--color-accent-2)'
    $c = $c -replace '#c5c6c7', 'var(--color-text-primary)'
    $c = $c -replace '#0b0c10', 'var(--color-bg-base)'
    $c = $c -replace '#1f2833', 'var(--color-bg-panel)'

    $c = $c -replace 'rgba\(102,252,241,([^)]+)\)', 'rgba(var(--ch-accent), $1)'
    $c = $c -replace 'rgba\(69,162,158,([^)]+)\)',  'rgba(var(--ch-accent-2), $1)'
    $c = $c -replace 'rgba\(197,198,199,([^)]+)\)', 'rgba(var(--ch-text-primary), $1)'

    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file.FullName, $c, $enc)
        $count++
        Write-Host "  modified: $($file.Name)"
    }
}

Write-Host "DONE: $count of $($files.Count) files modified."
