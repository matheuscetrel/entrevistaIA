@echo off
chcp 65001 >nul
if "%~1"=="" (
    start "Entrevista.IA - Modo Local" cmd /k ""%~dpnx0" --run"
    exit /b
)
setlocal enabledelayedexpansion

echo ========================================
echo   ENTREVISTA.IA - Modo Local
echo ========================================
echo.

echo [1/6] Verificando Python...
set "PY_CMD="
for %%C in (python py) do (
    %%C --version >nul 2>&1
    if !errorlevel! == 0 set "PY_CMD=%%C"
)
if not defined PY_CMD (
    echo.
    echo [ERRO] Python nao encontrado ou nao configurado corretamente!
    echo Instale Python 3.12+ de: https://www.python.org/downloads/
    echo e marque "Add Python to PATH" durante a instalacao.
    echo.
    pause
    exit /b 1
)
%PY_CMD% --version
echo.

echo [2/6] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Node.js nao encontrado!
    echo Instale de: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
node --version
echo.

echo [3/6] Verificando npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] npm nao encontrado!
    echo Verifique a instalacao do Node.js.
    echo.
    pause
    exit /b 1
)
npm --version
echo.

echo [4/6] Configurando backend...
cd backend

if not exist venv (
    echo Criando ambiente virtual...
    %PY_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao criar ambiente virtual!
        cd ..
        pause
        exit /b 1
    )
)

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo Atualizando pip...
%PY_CMD% -m pip install --upgrade pip >nul 2>&1

echo Instalando dependencias backend...
pip install -r requirements.txt >nul
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias do backend!
    cd ..
    pause
    exit /b 1
)

cd ..
echo Backend OK!
echo.

echo [5/6] Configurando frontend...
cd frontend

if not exist node_modules (
    echo Instalando dependencias do frontend...
    echo (Isso pode demorar alguns minutos na primeira vez)
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar dependencias do frontend!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo Dependencias do frontend ja instaladas!
)

cd ..
echo Frontend OK!
echo.

echo [6/6] Iniciando servicos...
echo.
echo ========================================
echo   PROJETO INICIADO!
echo ========================================
echo.
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - API Docs: http://localhost:8000/docs
echo.
echo O banco de dados SQLite sera criado automaticamente.
echo.

start "Entrevista.IA - Backend" cmd /k "cd /d %CD%\backend && call venv\Scripts\activate.bat && echo Iniciando backend... && echo. && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 5 /nobreak >nul

start "Entrevista.IA - Frontend" cmd /k "cd /d %CD%\frontend && echo Iniciando frontend... && echo. && set BROWSER=none && npm run dev -- --host 0.0.0.0 --port 3000"

timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   Servicos Iniciados!
echo ========================================
echo.
echo Acesse: http://localhost:3000
echo.
echo Para PARAR: Feche as janelas ou pressione Ctrl+C
echo.
pause
