@echo off
setlocal

echo Installing AutoRewarder to Program Files (needs Administrator)...
taskkill /F /IM AutoRewarder.exe >nul 2>&1
timeout /t 2 /nobreak >nul

robocopy "%~dp0dist\AutoRewarder" "C:\Program Files\AutoRewarder" /E /IS /IT /R:2 /W:1

rem Remove the obsolete pre-release APK left by older manual copies.
del /q "C:\Program Files\AutoRewarder\AutoRewarder-phone.apk" >nul 2>&1

echo.
echo Exit code %ERRORLEVEL% (0-7 is OK for robocopy)
if not exist "C:\Program Files\AutoRewarder\AutoRewarder.exe" (
    echo AutoRewarder.exe was not copied. Check the build folder and permissions.
    exit /b 1
)

start "" "C:\Program Files\AutoRewarder\AutoRewarder.exe"
endlocal
