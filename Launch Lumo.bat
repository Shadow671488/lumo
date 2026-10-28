@echo off
title Lumo Launcher
cd /d "%~dp0"

echo ===================================================
echo                    Lumo Launcher
echo ===================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH!
    echo Please ensure npm is installed and added to PATH.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\electron\" (
    echo [INFO] Installing required dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

if not exist "bin\ffmpeg.exe" (
    where ffmpeg >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] ffmpeg.exe was not found in bin\ or PATH.
        echo Audio playback and transcoding features may be limited.
        echo.
    )
)

if not exist "bin\yt-dlp.exe" (
    where yt-dlp >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] yt-dlp.exe was not found in bin\ or PATH.
        echo Online music streaming may not function.
        echo.
    )
)

echo [INFO] Starting Lumo...
call npm start
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Application exited with error code: %ERRORLEVEL%
    pause
)
