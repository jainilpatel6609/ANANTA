@echo off
set "PATH=C:\Users\ASUS\AppData\Roaming\nvm\v20.15.1;%PATH%"
cd /d "%~dp0backend"
echo =======================================================
echo   Starting ANANTA TRADERS Backend API Server (Port 5000)
echo =======================================================
npm start
pause
