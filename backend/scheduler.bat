@echo off
REM ============================================================
REM  scheduler.bat — Lance le scheduler Laravel toutes les minutes
REM  Trace FC — Synchronisation automatique des matchs
REM ============================================================
cd /d "C:\USERS\HP\MON-PROJET\TRACE-FOOT\backend"
"C:\xampp\php\php.exe" artisan schedule:run >> "C:\USERS\HP\MON-PROJET\TRACE-FOOT\backend\storage\logs\scheduler.log" 2>&1
