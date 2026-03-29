$SOURCE_DIR = "C:\Users\boton\OneDrive\Dokumentumok\Receptek"

Set-Location $PSScriptRoot
if (-not (Test-Path "content")) {
    New-Item -ItemType Directory -Path "content"
}
Set-Location "content"
if ($PWD.Path -notlike "*\content") {
    Write-Host "`nHIBA: Nem sikerult belepni a 'content' mappaba! A futas leall." -ForegroundColor Red
    pause
    exit 1
}

robocopy "$SOURCE_DIR" "." /MIR /COPY:DAT /DCOPY:DAT /NDL /NJH /NP

if ($LASTEXITCODE -ge 8) {
    Write-Host "`nHIBA: A kepek/fajlok szinkronizalasa megszakadt! (Hibakod: $LASTEXITCODE)"
    pause
    exit $LASTEXITCODE
}
Write-Host "`n======================================================="
Write-Host "Frontmatter datumok frissitese (date = modositas datuma)..."

$updatedCount = 0
$mdFiles = Get-ChildItem -Recurse -File -Filter "*.md"

foreach ($file in $mdFiles) {
    $modDateStr = $file.LastWriteTime.ToString("yyyy-MM-ddTHH:mm:sszzz")
    $lines = Get-Content $file.FullName -Encoding UTF8
    $hasChanges = $false
    
    if ($lines.Count -gt 0 -and $lines[0].Trim() -eq '---') {
        $endIdx = -1
        for ($i=1; $i -lt $lines.Count; $i++) {
            if ($lines[$i].Trim() -eq '---') {
                $endIdx = $i
                break
            }
        }
        
        if ($endIdx -ge 1) {
            $fmLines = $lines[1..($endIdx-1)]
            $hasDate = $false
            
            for ($i=0; $i -lt $fmLines.Count; $i++) {
                if ($fmLines[$i] -match '^\s*date\s*:') {
                    if ($fmLines[$i] -notmatch [regex]::Escape($modDateStr)) {
                        $fmLines[$i] = "date: $modDateStr"
                        $hasChanges = $true
                    }
                    $hasDate = $true
                }
            }
            
            $newFmLines = @()
            if (-not $hasDate) { 
                $newFmLines += "date: $modDateStr"
                $hasChanges = $true
            }
            $newFmLines += $fmLines
            
            if ($hasChanges) {
                $newLines = @('---') + $newFmLines + @('---')
                if ($endIdx -lt ($lines.Count - 1)) {
                    $newLines += $lines[($endIdx+1)..($lines.Count-1)]
                }
                Set-Content -Path $file.FullName -Value $newLines -Encoding UTF8
                $updatedCount++
            }
        }
    } else {
        $newLines = @(
            '---'
            "date: $modDateStr"
            '---'
            ''
        ) + $lines
        Set-Content -Path $file.FullName -Value $newLines -Encoding UTF8
        $updatedCount++
    }
}

Write-Host "Frissitve $updatedCount fajl."
Write-Host "=======================================================`n"

Set-Location ..
npx quartz sync

Write-Host "`nAll finished."
exit 0