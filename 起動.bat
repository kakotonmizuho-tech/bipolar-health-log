@echo off
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Please install from nodejs.org
  pause
  exit /b 1
)

start "" /B cmd /c "timeout /t 4 /nobreak > nul && start chrome http://localhost:5173"

npm run dev
pause
