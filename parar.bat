@echo off
chcp 65001 >nul
rem Desliga o servidor do SIMEAOBuddy (porta 3100), mesmo quando ele está rodando escondido.
set ACHOU=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3100 .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
  set ACHOU=1
)
if defined ACHOU (echo Servidor desligado.) else (echo O servidor ja estava desligado.)
timeout /t 3 >nul
