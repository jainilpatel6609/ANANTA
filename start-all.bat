@echo off
set "PATH=C:\Users\ASUS\AppData\Roaming\nvm\v20.15.1;%PATH%"
echo =======================================================
echo   Starting ANANTA TRADERS (Backend + Frontend)
echo =======================================================
start "ANANTA Backend" cmd /k "cd /d %~dp0backend && set PATH=C:\Users\ASUS\AppData\Roaming\nvm\v20.15.1;%PATH% && npm start"
start "ANANTA Frontend" cmd /k "cd /d %~dp0frontend && set PATH=C:\Users\ASUS\AppData\Roaming\nvm\v20.15.1;%PATH% && npm run dev"
