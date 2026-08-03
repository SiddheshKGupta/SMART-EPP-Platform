@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing prototype dependencies...
  call npm.cmd install
  if errorlevel 1 goto :error
)

echo Starting Smart EPP Subvention Control Centre...
start "Smart EPP Prototype Server" /min cmd.exe /c "npm.cmd run dev --workspace apps/web"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://localhost:3000/subvention';" ^
  "$limit=(Get-Date).AddSeconds(60);" ^
  "do { try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($response.StatusCode -eq 200){ Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while((Get-Date) -lt $limit);" ^
  "Write-Error 'Prototype did not become ready within 60 seconds.'; exit 1"

if errorlevel 1 goto :error
echo Prototype opened at http://localhost:3000/subvention
exit /b 0

:error
echo.
echo Prototype launch failed. Review the error above.
pause
exit /b 1
