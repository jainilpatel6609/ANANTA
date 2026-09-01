@echo off
set "PATH=C:\Users\ASUS\AppData\Roaming\nvm\v20.15.1;%PATH%"
cd /d "%~dp0frontend"
echo =======================================================
echo   Starting ANANTA TRADERS Frontend Web App (Port 5173)
echo =======================================================
npm run dev
pause
