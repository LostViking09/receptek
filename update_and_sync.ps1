$SOURCE_DIR = "C:\Users\boton\OneDrive\Dokumentumok\Receptek"

Set-Location $PSScriptRoot
Set-Location "content"

robocopy "$SOURCE_DIR" "." /MIR /COPY:DAT /DCOPY:DAT /NDL /NJH /NP

if ($LASTEXITCODE -ge 8) {
    Write-Host "`nHIBA: A kepek/fajlok szinkronizalasa megszakadt! (Hibakod: $LASTEXITCODE)"
    pause
    exit $LASTEXITCODE
}

Write-Host "`n======================================================="
Write-Host "Datumok automatikus javitasa (Letrehozas = Modositas)..."
Start-Sleep -Seconds 3
Get-ChildItem -File -Recurse | ForEach-Object { $_.CreationTime = $_.LastWriteTime }
Write-Host "`n=======================================================`n"

Set-Location ..
npx quartz sync

Write-Host "`nAll finished."
exit 0
