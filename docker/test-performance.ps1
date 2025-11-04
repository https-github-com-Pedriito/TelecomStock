# Script de test de performance Nginx

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Test de Performance Nginx/Vite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour mesurer le temps de réponse
function Test-ResponseTime {
    param(
        [string]$Url,
        [string]$Description
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    $results = @()
    
    # Ignorer les erreurs SSL en dev
    if (-not ([System.Management.Automation.PSTypeName]'ServerCertificateValidationCallback').Type) {
        $certCallback = @"
            using System;
            using System.Net;
            using System.Net.Security;
            using System.Security.Cryptography.X509Certificates;
            public class ServerCertificateValidationCallback {
                public static void Ignore() {
                    if(ServicePointManager.ServerCertificateValidationCallback == null) {
                        ServicePointManager.ServerCertificateValidationCallback += 
                            delegate (Object obj, X509Certificate certificate, X509Chain chain, SslPolicyErrors errors) { return true; };
                    }
                }
            }
"@
        Add-Type $certCallback
    }
    [ServerCertificateValidationCallback]::Ignore()
    
    # Faire 5 requêtes pour avoir une moyenne
    for ($i = 1; $i -le 5; $i++) {
        $start = Get-Date
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 10
            $end = Get-Date
            $duration = ($end - $start).TotalMilliseconds
            $results += $duration
            Write-Host "  Request $i : $([math]::Round($duration, 0))ms - Status: $($response.StatusCode)" -ForegroundColor Green
        }
        catch {
            $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A" }
            if ($statusCode -eq 401) {
                # 401 = Unauthorized, c'est normal sans token, mais on mesure le temps quand même
                $end = Get-Date
                $duration = ($end - $start).TotalMilliseconds
                $results += $duration
                Write-Host "  Request $i : $([math]::Round($duration, 0))ms - Status: 401 (Expected)" -ForegroundColor Yellow
            }
            else {
                Write-Host "  Request $i : FAILED - Status: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Start-Sleep -Milliseconds 100
    }
    
    if ($results.Count -gt 0) {
        $avg = ($results | Measure-Object -Average).Average
        $min = ($results | Measure-Object -Minimum).Minimum
        $max = ($results | Measure-Object -Maximum).Maximum
        
        Write-Host "  Average: $([math]::Round($avg, 0))ms | Min: $([math]::Round($min, 0))ms | Max: $([math]::Round($max, 0))ms" -ForegroundColor Cyan
    }
    
    Write-Host ""
    return $results
}

Write-Host "1. Test: Frontend via Nginx (HTTPS)" -ForegroundColor Magenta
Write-Host "   (Mesure le temps total incluant TLS + proxy + Vite)" -ForegroundColor Gray
$nginxResults = Test-ResponseTime -Url "https://localhost/" -Description "Frontend via Nginx"

Write-Host "2. Test: Frontend direct Vite (HTTPS)" -ForegroundColor Magenta
Write-Host "   (Mesure le temps sans proxy Nginx)" -ForegroundColor Gray
$viteResults = Test-ResponseTime -Url "https://localhost:5173/" -Description "Frontend direct Vite"

Write-Host "3. Test: API via Nginx (HTTPS)" -ForegroundColor Magenta
Write-Host "   (Doit échouer sans token, mais mesure le TTFB)" -ForegroundColor Gray
$apiNginxResults = Test-ResponseTime -Url "https://localhost/api/articles" -Description "API via Nginx"

Write-Host "4. Test: API direct (HTTP)" -ForegroundColor Magenta
Write-Host "   (Bypass Nginx pour comparaison)" -ForegroundColor Gray
$apiDirectResults = Test-ResponseTime -Url "http://localhost:3080/articles" -Description "API direct"

# Calcul de l'overhead Nginx
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Analyse de Performance" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($nginxResults.Count -gt 0 -and $viteResults.Count -gt 0) {
    $nginxAvg = ($nginxResults | Measure-Object -Average).Average
    $viteAvg = ($viteResults | Measure-Object -Average).Average
    $overhead = $nginxAvg - $viteAvg
    $overheadPercent = ($overhead / $viteAvg) * 100
    
    Write-Host "Frontend Performance:" -ForegroundColor Yellow
    Write-Host "  - Nginx Proxy: $([math]::Round($nginxAvg, 0))ms" -ForegroundColor White
    Write-Host "  - Direct Vite: $([math]::Round($viteAvg, 0))ms" -ForegroundColor White
    Write-Host "  - Overhead: $([math]::Round($overhead, 0))ms ($([math]::Round($overheadPercent, 1))%)" -ForegroundColor $(if ($overheadPercent -lt 30) { "Green" } elseif ($overheadPercent -lt 50) { "Yellow" } else { "Red" })
    Write-Host ""
}

if ($apiNginxResults.Count -gt 0 -and $apiDirectResults.Count -gt 0) {
    $apiNginxAvg = ($apiNginxResults | Measure-Object -Average).Average
    $apiDirectAvg = ($apiDirectResults | Measure-Object -Average).Average
    $apiOverhead = $apiNginxAvg - $apiDirectAvg
    $apiOverheadPercent = ($apiOverhead / $apiDirectAvg) * 100
    
    Write-Host "API Performance:" -ForegroundColor Yellow
    Write-Host "  - Nginx Proxy: $([math]::Round($apiNginxAvg, 0))ms" -ForegroundColor White
    Write-Host "  - Direct API: $([math]::Round($apiDirectAvg, 0))ms" -ForegroundColor White
    Write-Host "  - Overhead: $([math]::Round($apiOverhead, 0))ms ($([math]::Round($apiOverheadPercent, 1))%)" -ForegroundColor $(if ($apiOverheadPercent -lt 30) { "Green" } elseif ($apiOverheadPercent -lt 50) { "Yellow" } else { "Red" })
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Recommandations:" -ForegroundColor Yellow
Write-Host "  - Overhead < 30%: ✅ Excellent" -ForegroundColor Green
Write-Host "  - Overhead 30-50%: ⚠️  Acceptable" -ForegroundColor Yellow
Write-Host "  - Overhead > 50%: ❌ À optimiser" -ForegroundColor Red
Write-Host ""
Write-Host "Pour améliorer:" -ForegroundColor Cyan
Write-Host "  1. Vérifier que Keep-Alive est actif (voir NGINX-OPTIMIZATION.md)" -ForegroundColor Gray
Write-Host "  2. Activer le cache TLS session (ssl_session_cache)" -ForegroundColor Gray
Write-Host "  3. Augmenter les buffers (proxy_buffers)" -ForegroundColor Gray
Write-Host "  4. Activer la compression (gzip)" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
