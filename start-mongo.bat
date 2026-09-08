@echo off
title ANANTA TRADERS - MongoDB Server
echo ===================================================
echo   ANANTA TRADERS - Starting Local MongoDB Server
echo   Port: 27017
echo   Data Path: D:\ANANTA\data\db
echo ===================================================
"C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe" --dbpath "D:\ANANTA\data\db" --port 27017
pause
