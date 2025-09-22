# Script PowerShell de pré-démarrage Docker avec gestion automatique des certificats
Write-Host "🐳 Préparation de l'environnement Docker..." -ForegroundColor Cyan

# Se placer dans le dossier parent pour exécuter l'auto-configuration
Push-Location ..

try {
    # Exécuter l'auto-configuration des certificats
    Write-Host "🔐 Configuration automatique des certificats..." -ForegroundColor Yellow
    node auto-cert-manager.cjs auto
    
    # Revenir dans le dossier docker
    Pop-Location
    Push-Location docker
    
    # Vérifier si des conteneurs sont en cours d'exécution
    $runningContainers = docker-compose ps --services --filter "status=running"
    
    if ($runningContainers) {
        Write-Host "🔄 Redémarrage des conteneurs avec nouveaux certificats..." -ForegroundColor Yellow
        docker-compose down
        Start-Sleep -Seconds 2
        docker-compose up -d
    } else {
        Write-Host "🚀 Démarrage des conteneurs..." -ForegroundColor Yellow
        docker-compose up -d
    }
    
    Write-Host "✅ Environnement Docker prêt !" -ForegroundColor Green
    Write-Host "📍 API: https://$(node ../auto-cert-manager.cjs ip):3443/" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}