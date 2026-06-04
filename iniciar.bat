@echo off
chcp 65001 >nul
echo ============================================
echo    Sistema de Cobranca - iniciando...
echo ============================================
echo.
echo Abrindo o backend (API) e o frontend (site)...
start "Cobranca - API (backend)" cmd /k "cd /d %~dp0app && npm run start:dev"
start "Cobranca - Web (frontend)" cmd /k "cd /d %~dp0web && npm run dev"
echo.
echo Aguardando os servidores subirem (15 segundos)...
timeout /t 15 /nobreak >nul
start "" http://localhost:3001
echo.
echo ============================================
echo  Pronto! O site abriu em http://localhost:3001
echo  Login:  empresa = demo
echo          email   = admin@demo.com
echo          senha   = demo1234
echo.
echo  Para PARAR: feche as duas janelas pretas
echo  que abriram (API e Web).
echo ============================================
pause
