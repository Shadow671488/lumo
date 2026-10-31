@echo off
title Lumo - Sync with Upstream Riff
cd /d "%~dp0"

echo ===================================================
echo     Lumo - Upstream Riff Sync Engine
echo ===================================================
echo.
echo This tool pulls the latest official bug fixes from
echo Riff (https://github.com/rootscripts/riff) and merges
echo them into your Lumo build, while keeping ALL your
echo custom features, profiles, and branding intact!
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

node scripts/sync-upstream.js %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Sync encountered an issue. See details above.
    pause
    exit /b 1
)

echo.
pause
