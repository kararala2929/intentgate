@echo off
cd /d "%~dp0"
title IntentGate Dev Server

echo ========================================================
echo   IntentGate - Starting Development Server...
echo ========================================================
echo Current folder: %CD%
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not recognized in your command prompt.
    echo Please make sure Node.js is installed from https://nodejs.org/
    echo If you just installed it, please close this window and run it again.
    echo.
    start "" "https://nodejs.org/"
    pause
    exit /b 1
)

:: 2. Check and install dependencies if vite is missing
if not exist "node_modules\.bin\vite.cmd" (
    echo [1/2] Missing dependencies detected. Installing packages...
    echo Running "npm install --legacy-peer-deps"... Please wait.
    echo.
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
    echo.
    echo [1/2] Packages installed successfully!
    echo.
)

:: 3. Start server
echo [2/2] Starting development server...
echo Access URL: http://localhost:3000
echo (Opening browser in a few seconds...)
echo.

start "" "http://localhost:3000"
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server stopped with error code %errorlevel%.
)
pause
