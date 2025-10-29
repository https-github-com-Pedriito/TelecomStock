#!/bin/sh
# Script pour attendre que Vite soit prêt avant de démarrer Nginx

echo "Attente du démarrage de Vite sur https://telecomstock_frontend:5173..."

MAX_TRIES=60
COUNTER=0

while [ $COUNTER -lt $MAX_TRIES ]; do
    # Essayer de se connecter à Vite (accepter les certificats auto-signés)
    if wget --no-check-certificate --spider --quiet https://telecomstock_frontend:5173 2>/dev/null; then
        echo "✓ Vite est prêt !"
        break
    fi
    
    COUNTER=$((COUNTER + 1))
    echo "Tentative $COUNTER/$MAX_TRIES - Vite n'est pas encore prêt, attente de 2 secondes..."
    sleep 2
done

if [ $COUNTER -eq $MAX_TRIES ]; then
    echo "✗ Timeout: Vite n'a pas démarré après 120 secondes"
    echo "Démarrage de Nginx quand même..."
fi

echo "Démarrage de Nginx..."
exec nginx -g 'daemon off;'
