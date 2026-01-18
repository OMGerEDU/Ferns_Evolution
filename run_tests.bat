@echo off
echo 🚀 Running Local Integration Tests...
node scripts/test_local.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Tests failed!
    exit /b %errorlevel%
)
echo.
echo ✅ All tests passed!
exit /b 0
