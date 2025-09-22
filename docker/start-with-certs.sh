#!/bin/bash

# Script de pré-démarrage Docker avec gestion automatique des certificats
echo "🐳 Préparation de l'environnement Docker..."

# Exécuter l'auto-configuration des certificats
node ../auto-cert-manager.cjs auto

# Redémarrer les conteneurs si ils sont déjà en cours
if docker-compose ps | grep -q "Up"; then
    echo "🔄 Redémarrage des conteneurs avec nouveaux certificats..."
    docker-compose down
    docker-compose up -d
else
    echo "🚀 Démarrage des conteneurs..."
    docker-compose up -d
fi

echo "✅ Environnement Docker prêt !"