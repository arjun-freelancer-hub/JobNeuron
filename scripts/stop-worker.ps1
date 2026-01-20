# Script to find and stop automation worker processes

Write-Host "Searching for automation worker processes..." -ForegroundColor Yellow

# Find node processes that might be running the automation worker
$processes = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -notlike "*Cursor*" -and $_.Path -notlike "*node_modules*"
}

if ($processes) {
    Write-Host "Found $($processes.Count) node process(es):" -ForegroundColor Cyan
    $processes | Format-Table Id, ProcessName, Path -AutoSize
    
    Write-Host "`nTo stop a specific process, use:" -ForegroundColor Yellow
    Write-Host "Stop-Process -Id <process-id>" -ForegroundColor Green
} else {
    Write-Host "No automation worker processes found." -ForegroundColor Green
    Write-Host "The worker might be running in a terminal window." -ForegroundColor Yellow
    Write-Host "Check your terminal windows and press Ctrl+C to stop it." -ForegroundColor Yellow
}

Write-Host "`nNote: The worker will auto-stop after 10 consecutive 404s (50 seconds)" -ForegroundColor Cyan
