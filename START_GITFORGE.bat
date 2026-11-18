@echo off
title GitForge Platform Launcher
color 0B
echo ====================================================
echo             GITFORGE ALL-IN-ONE LAUNCHER
echo ====================================================
echo.

echo [1/3] Checking MySQL service status...
sc query MySQL80 | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] MySQL80 service is not running. Starting MySQL...
    net start MySQL80 >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Requesting Administrator privileges to start MySQL...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c net start MySQL80' -Verb RunAs -Wait"
    )
) else (
    echo [OK] MySQL80 is already running.
)

echo.
echo [2/3] Launching GitForge Backend Server (Port 5000)...
start "GitForge Backend (Port 5000)" cmd /k "cd /d ""%~dp0server"" && node node_modules\tsx\dist\cli.mjs src\index.ts"

timeout /t 3 /nobreak >nul

echo [3/3] Launching GitForge Frontend (Port 5174)...
start "GitForge Frontend (Port 5174)" cmd /k "cd /d ""%~dp0client"" && node node_modules\vite\bin\vite.js --port 5174 --host"

timeout /t 2 /nobreak >nul

echo.
echo ====================================================
echo All services started successfully!
echo Opening GitForge Web UI in your default browser...
echo ====================================================
start http://localhost:5174

exit
