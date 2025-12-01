@echo off
REM HesabPak Service Management Menu
REM Interactive menu for managing Docker services

:menu
cls
echo.
echo ================================================
echo   HesabPak Service Management
echo ================================================
echo.
echo Select an option:
echo.
echo   1) Start HesabPak (docker compose up -d)
echo   2) Stop HesabPak (docker compose down)
echo   3) Restart HesabPak
echo   4) View service status
echo   5) View logs (backend)
echo   6) View logs (frontend)
echo   7) View logs (database)
echo   8) View all logs
echo   9) Reset everything (delete volumes and images)
echo   10) Open web interface in browser
echo   11) Open API documentation
echo   12) Database shell access
echo   0) Exit
echo.
set /p choice="Enter your choice (0-12): "

if "%choice%"=="1" goto start_services
if "%choice%"=="2" goto stop_services
if "%choice%"=="3" goto restart_services
if "%choice%"=="4" goto status
if "%choice%"=="5" goto logs_backend
if "%choice%"=="6" goto logs_frontend
if "%choice%"=="7" goto logs_db
if "%choice%"=="8" goto logs_all
if "%choice%"=="9" goto reset
if "%choice%"=="10" goto open_web
if "%choice%"=="11" goto open_api
if "%choice%"=="12" goto db_shell
if "%choice%"=="0" goto end

echo Invalid choice. Press any key to try again...
pause
goto menu

:start_services
echo.
echo Starting HesabPak services...
docker compose up -d --build
echo.
echo Services started. Waiting 15 seconds for initialization...
timeout /t 15 /nobreak
echo Press any key to return to menu...
pause
goto menu

:stop_services
echo.
echo Stopping HesabPak services...
docker compose down
echo.
echo Services stopped.
pause
goto menu

:restart_services
echo.
echo Restarting HesabPak services...
docker compose restart
echo.
echo Services restarted. Waiting 10 seconds...
timeout /t 10 /nobreak
echo Press any key to return to menu...
pause
goto menu

:status
echo.
echo Current service status:
echo.
docker compose ps
echo.
pause
goto menu

:logs_backend
echo.
echo Backend logs (press Ctrl+C to stop):
echo.
docker compose logs -f backend
goto menu

:logs_frontend
echo.
echo Frontend logs (press Ctrl+C to stop):
echo.
docker compose logs -f frontend
goto menu

:logs_db
echo.
echo Database logs (press Ctrl+C to stop):
echo.
docker compose logs -f db
goto menu

:logs_all
echo.
echo All logs (press Ctrl+C to stop):
echo.
docker compose logs -f
goto menu

:reset
echo.
echo WARNING: This will delete all data!
echo.
set /p confirm="Type 'yes' to confirm: "
if not "%confirm%"=="yes" (
    echo Cancelled.
    pause
    goto menu
)

echo.
echo Stopping services...
docker compose down -v

echo Removing images...
docker system prune -a -f

echo Removing volumes...
docker volume prune -f

echo.
echo Reset complete. Starting fresh...
docker compose up -d --build

timeout /t 20 /nobreak
pause
goto menu

:open_web
echo.
echo Opening web interface...
start http://localhost:3000
timeout /t 2 /nobreak
goto menu

:open_api
echo.
echo Opening API documentation...
start http://localhost:8000/docs
timeout /t 2 /nobreak
goto menu

:db_shell
echo.
echo Connecting to database shell...
echo.
docker exec -it hp-db-1 psql -U postgres -d hesabpak
goto menu

:end
echo.
echo Goodbye!
exit /b 0
