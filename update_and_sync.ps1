param(
    [switch]$DryRun,
    [switch]$Serve
)

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

Write-Host "`nSzinkronizacio es kepoptimalizalas ($SOURCE_DIR -> content)..."

$maxWidth = 1000
$maxHeight = 1000
$quality = 82

$thumbWidth = 300
$thumbHeight = 300
$thumbQuality = 82

# 1. Torolt fajlok eltavolitasa a content-bol
$destFiles = Get-ChildItem -Recurse -File
foreach ($dFile in $destFiles) {
    if ($dFile.Extension -eq '.git' -or $dFile.FullName -match '\\\.obsidian\\') { continue }
    
    $relPath = [System.IO.Path]::GetRelativePath($PWD.Path, $dFile.FullName)
    $sFile = Join-Path $SOURCE_DIR $relPath
    
    $shouldDelete = -not (Test-Path $sFile)
    
    if ($shouldDelete) {
        if ($dFile.FullName -match '\.thumb\.jpg$') {
            $base = $sFile.Substring(0, $sFile.Length - 10)
            if ((Test-Path "$base.png") -or (Test-Path "$base.webp") -or (Test-Path "$base.jpeg") -or (Test-Path "$base.jpg")) {
                $shouldDelete = $false
            }
        } elseif ($dFile.Extension -match '(?i)\.jpg$') {
            $base = $sFile.Substring(0, $sFile.Length - 4)
            if ((Test-Path "$base.png") -or (Test-Path "$base.webp") -or (Test-Path "$base.jpeg") -or (Test-Path "$base.jpg")) {
                $shouldDelete = $false
            }
        }
    }
    
    if ($shouldDelete) {
            Remove-Item $dFile.FullName -Force
        }
    }

# 2. Uj / modositott fajlok szinkronizalasa es optimalizalasa
$srcFiles = Get-ChildItem -Path $SOURCE_DIR -Recurse -File
foreach ($sFile in $srcFiles) {
    if ($sFile.Name -eq ".DS_Store" -or $sFile.FullName -match '\\\.obsidian\\') { continue }
    
    $relPath = [System.IO.Path]::GetRelativePath($SOURCE_DIR, $sFile.FullName)
    $dFile = Join-Path $PWD.Path $relPath
    $dDir = Split-Path $dFile -Parent
    
    if (-not (Test-Path $dDir)) { New-Item -ItemType Directory -Path $dDir -Force | Out-Null }
    
    $isImage = $sFile.Extension -match '(?i)\.(png|webp|jpeg|jpg)$'
    
    if ($isImage) {
        $finalDest = [System.IO.Path]::ChangeExtension($dFile, '.jpg')
        $thumbDest = [System.IO.Path]::ChangeExtension($dFile, '.thumb.jpg')
        $needsCopy = $true
        if ((Test-Path $finalDest) -and (Test-Path $thumbDest)) {
            $dTime = (Get-Item $finalDest).LastWriteTime
            $tTime = (Get-Item $thumbDest).LastWriteTime
            if (($sFile.LastWriteTime -le $dTime) -and ($sFile.LastWriteTime -le $tTime)) {
                $needsCopy = $false
            }
        }
        
        if ($needsCopy) {
            Write-Host "Konvertalas/Optimalizalas: $($sFile.Name)..." -ForegroundColor Cyan
                magick "$($sFile.FullName)" -resize "$($maxWidth)x$($maxHeight)>" -interlace Plane -quality $quality -strip "$finalDest"
                magick "$($sFile.FullName)" -resize "$($thumbWidth)x$($thumbHeight)>" -interlace Plane -quality $thumbQuality -strip "$thumbDest"
            }
    } else {
        $needsCopy = $true
        if (Test-Path $dFile) {
            $dTime = (Get-Item $dFile).LastWriteTime
            if ($sFile.LastWriteTime -le $dTime) {
                $needsCopy = $false
            }
        }
        
        if ($needsCopy) {
            Copy-Item $sFile.FullName $dFile -Force
        }
        }
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

if ($DryRun) {
    Write-Host "Dry-run mode active. Skipping quartz sync/serve." -ForegroundColor Yellow
} elseif ($Serve) {
    Write-Host "Starting local preview (quartz build --serve)..." -ForegroundColor Cyan
    npx quartz build --serve
} else {
    Write-Host "Syncing to git/remote (quartz sync)..." -ForegroundColor Green
    npx quartz sync
}

Write-Host "`nAll finished."
exit 0
