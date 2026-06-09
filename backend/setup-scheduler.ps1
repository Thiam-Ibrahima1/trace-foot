# ============================================================
# Setup du scheduler Laravel pour Trace FC
# Exécuter en tant qu'administrateur dans PowerShell
# ============================================================

$phpPath   = (Get-Command php -ErrorAction SilentlyContinue).Source
$backendDir = "C:\users\hp\mon-projet\trace-foot\backend"
$artisan    = "$backendDir\artisan"

if (-not $phpPath) {
    Write-Host "ERREUR : PHP introuvable dans le PATH." -ForegroundColor Red
    Write-Host "Vérifiez que PHP est installé et dans le PATH système." -ForegroundColor Yellow
    exit 1
}

Write-Host "PHP trouvé : $phpPath" -ForegroundColor Green
Write-Host "Création de la tâche planifiée TraceFC-Laravel-Scheduler..." -ForegroundColor Cyan

# Supprimer l'ancienne tâche si elle existe
Unregister-ScheduledTask -TaskName "TraceFC-Laravel-Scheduler" -Confirm:$false -ErrorAction SilentlyContinue

# Créer l'action : php artisan schedule:run
$action = New-ScheduledTaskAction `
    -Execute $phpPath `
    -Argument "artisan schedule:run" `
    -WorkingDirectory $backendDir

# Déclencheur : toutes les minutes indéfiniment
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval  ([System.TimeSpan]::FromMinutes(1)) `
    -RepetitionDuration  ([System.TimeSpan]::MaxValue)

# Paramètres : tourne même si personne n'est connecté
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([System.TimeSpan]::FromMinutes(2)) `
    -RestartCount 3 `
    -RestartInterval ([System.TimeSpan]::FromMinutes(1)) `
    -StartWhenAvailable

# Enregistrer la tâche
Register-ScheduledTask `
    -TaskName "TraceFC-Laravel-Scheduler" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host ""
Write-Host "Tache planifiee creee avec succes !" -ForegroundColor Green
Write-Host ""
Write-Host "Verification :" -ForegroundColor Cyan
Get-ScheduledTask -TaskName "TraceFC-Laravel-Scheduler" | Select-Object TaskName, State
Write-Host ""
Write-Host "Le scheduler Laravel tourne desormais toutes les minutes." -ForegroundColor Green
Write-Host "Les taches s'executeront automatiquement a :" -ForegroundColor White
Write-Host "  03:55 Dakar -> Generation traces + VIP" -ForegroundColor Yellow
Write-Host "  04:00 Dakar -> Mise a jour scores reels" -ForegroundColor Yellow
Write-Host "  04:05 Dakar -> Synchronisation utilisateurs" -ForegroundColor Yellow
