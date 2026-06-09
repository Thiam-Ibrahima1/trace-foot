@echo off
REM ============================================================
REM  installer-tache.bat — Installation automatique du scheduler
REM  Double-cliquer ce fichier EN TANT QU'ADMINISTRATEUR
REM ============================================================

echo.
echo  === Trace FC - Installation du scheduler automatique ===
echo.

REM Verifier si le script est lance en administrateur
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERREUR : Veuillez clic-droit sur ce fichier et choisir
    echo          "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

REM Supprimer l'ancienne tache si elle existe
schtasks /Delete /TN "TraceFC\SchedulerLaravel" /F >nul 2>&1

REM Creer le dossier de taches TraceFC
schtasks /Create /TN "TraceFC\SchedulerLaravel" ^
  /TR "\"C:\USERS\HP\MON-PROJET\TRACE-FOOT\backend\scheduler.bat\"" ^
  /SC MINUTE ^
  /MO 1 ^
  /RU "SYSTEM" ^
  /RL HIGHEST ^
  /F

if %errorlevel% equ 0 (
    echo.
    echo  [OK] Tache planifiee installee avec succes !
    echo  [OK] Le scheduler s'executera toutes les minutes
    echo  [OK] Synchronisation automatique a 04:05 chaque jour
    echo.
    echo  Verification de la tache :
    schtasks /Query /TN "TraceFC\SchedulerLaravel" /FO LIST
) else (
    echo.
    echo  [ERREUR] Installation echouee. Essayez la methode manuelle :
    echo  1. Ouvrir "Planificateur de taches" Windows
    echo  2. Clic droit sur "Bibliotheque du planificateur"
    echo  3. Importer une tache...
    echo  4. Choisir le fichier : tache-planifiee.xml
    echo.
)

pause
