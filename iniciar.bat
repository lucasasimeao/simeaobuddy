@echo off
chcp 65001 >nul
title SIMEAOBuddy
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)

rem Abre o navegador 2 segundos depois do servidor subir
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3100"

call npm start
pause
