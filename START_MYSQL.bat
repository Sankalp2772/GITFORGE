@echo off
title Start MySQL Service
echo Starting MySQL80 service...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Elevating permissions...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c net start MySQL80 & echo. & pause' -Verb RunAs"
    exit /b
)

net start MySQL80
echo.
pause
