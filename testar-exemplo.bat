@echo off
chcp 65001 >nul
rem Liga o SIMEAOBuddy no BANCO DE EXEMPLO (data/exemplo.db), com treinos fictícios para testar.
rem O banco real (data/treino.db) não é tocado. Para voltar ao normal: parar.bat e depois o ícone SIMEAOBuddy.
cd /d "%~dp0"
echo Desligando o servidor normal...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
if not exist data\exemplo.db call npm run seed
if not exist logs mkdir logs
powershell -NoProfile -Command "$env:DB_PATH='data/exemplo.db'; Start-Process node -ArgumentList '--disable-warning=ExperimentalWarning','server.js' -WindowStyle Hidden -RedirectStandardOutput logs\exemplo.log"
powershell -NoProfile -Command "Start-Sleep 3"
start http://localhost:3100
echo.
echo Modo EXEMPLO ligado. Entre com usuario: exemplo   senha: exemplo123
echo Para voltar ao banco real: parar.bat e depois o icone SIMEAOBuddy.
powershell -NoProfile -Command "Start-Sleep 8"
