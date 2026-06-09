@echo off
C:\Windows\System32\schtasks.exe /create /tn "TraceFC-Laravel-Scheduler" /tr "php C:\users\hp\mon-projet\trace-foot\backend\artisan schedule:run" /sc MINUTE /mo 1 /f
if %errorlevel%==0 (
    echo Tache planifiee creee avec succes !
    echo Le scheduler Laravel tournera toutes les minutes.
) else (
    echo ERREUR : Relancez ce fichier en tant qu'administrateur.
    echo Clic droit sur le fichier ^> Executer en tant qu'administrateur
)
pause
