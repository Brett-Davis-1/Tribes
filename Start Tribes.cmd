@echo off
cd /d "%~dp0"
node server.mjs --open
if errorlevel 1 pause
