@echo off
echo [1/3] Stopping containers...
docker compose down

echo [2/3] Building and starting containers...
docker compose up --build -d

echo [3/3] Checking logs (waiting 10s for startup)...
timeout /t 10 /nobreak > nul

echo ================= FRONTEND LOGS =================
docker compose logs frontend

echo ================= BACKEND LOGS =================
docker compose logs backend

echo.
echo Done.
