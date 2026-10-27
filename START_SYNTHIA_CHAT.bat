@echo off
setlocal
cd /d "%~dp0"
title Synthia - Existing Computer Chat
echo ========================================
echo       SYNTHIA - REAL LOCAL CHAT
echo ========================================
echo.
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 or later is required on this computer.
  echo Install Node.js and reopen this launcher.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js.
  pause
  exit /b 1
)
where ollama >nul 2>&1
if errorlevel 1 (
  echo Ollama was not found. Install the free Ollama desktop application first.
  echo Synthia will not fake a conversational response without a real model.
  pause
  exit /b 1
)
ollama list >nul 2>&1
if errorlevel 1 (
  echo Ollama is not responding. Start your Ollama application and try again.
  pause
  exit /b 1
)
if not exist "computer\shell\kimi-linux\node_modules" (
  echo Installing the EXISTING Computer desktop dependencies...
  call npm --prefix computer\shell\kimi-linux ci --no-audit --no-fund
  if errorlevel 1 goto :fail
)
echo Building the EXISTING Computer interface...
call npm --prefix computer\shell\kimi-linux run build
if errorlevel 1 goto :fail
echo.
echo Starting Synthia Computer and opening Chat...
start "Synthia Computer" cmd /k "npm --prefix computer start"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8765"
echo Open the Synthia app inside Computer.
echo If she reports no model, use Ollama to install llama3.2 and try again.
exit /b 0
:fail
echo Synthia could not launch. This attempt did not alter the original project.
pause
exit /b 1
