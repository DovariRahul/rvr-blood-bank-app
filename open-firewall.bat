@echo off
echo ============================================
echo  RVR Blood Bank - Open Firewall Port 5000
echo ============================================
echo.

netsh advfirewall firewall add rule name="RVR Blood Bank Backend (Port 5000)" dir=in action=allow protocol=TCP localport=5000

if %errorlevel%==0 (
    echo.
    echo ✅ SUCCESS! Port 5000 is now open.
    echo    Your phone can now reach the backend.
) else (
    echo.
    echo ❌ FAILED! Please right-click this file
    echo    and select "Run as Administrator"
)
echo.
pause
