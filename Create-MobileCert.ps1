# Script PowerShell pour créer un certificat auto-signé compatible mobile
param(
    [string]$IPAddress = "192.168.1.53",
    [string]$CertName = "TelecomStock-Mobile",
    [int]$ValidDays = 365
)

Write-Host "🔐 Création du certificat auto-signé pour mobile..." -ForegroundColor Green

try {
    # Créer les Subject Alternative Names (SAN)
    $san = @(
        "DNS:localhost"
        "DNS:*.localhost" 
        "IP:127.0.0.1"
        "IP:$IPAddress"
        "IP:172.24.112.1"
    )

    # Créer le certificat auto-signé
    $cert = New-SelfSignedCertificate `
        -Subject "CN=$CertName" `
        -DnsName $san `
        -CertStoreLocation "cert:\LocalMachine\My" `
        -NotAfter (Get-Date).AddDays($ValidDays) `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -Provider "Microsoft RSA SChannel Cryptographic Provider"

    Write-Host "✅ Certificat créé avec succès !" -ForegroundColor Green
    Write-Host "📋 Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow

    # Exporter le certificat et la clé privée
    $certPath = ".\mobile-cert.pem"
    $keyPath = ".\mobile-key.pem"
    
    # Exporter en format PEM
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = "-----BEGIN CERTIFICATE-----`n"
    $certPem += [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $certPem += "`n-----END CERTIFICATE-----"
    
    [System.IO.File]::WriteAllText($certPath, $certPem)
    
    Write-Host "📁 Certificat exporté vers: $certPath" -ForegroundColor Cyan
    
    # Note: L'export de la clé privée en PEM nécessite des outils supplémentaires
    # Pour l'instant, nous allons utiliser le certificat avec IIS Express ou un serveur compatible
    
    # Copier vers le dossier API si il existe
    if (Test-Path ".\api") {
        Copy-Item $certPath ".\api\mobile-cert.pem" -Force
        Write-Host "📁 Certificat copié vers le dossier API" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "🔧 Configuration nécessaire :" -ForegroundColor Yellow
    Write-Host "1. Le certificat a été installé dans le magasin LocalMachine\My" -ForegroundColor White
    Write-Host "2. Thumbprint du certificat : $($cert.Thumbprint)" -ForegroundColor White
    Write-Host "3. Vous pouvez maintenant configurer votre serveur pour utiliser ce certificat" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erreur lors de la création du certificat : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
