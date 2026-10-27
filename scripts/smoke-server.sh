#!/usr/bin/env bash
#
# Demarre le BUILD DE PRODUCTION contre le Postgres jetable de `npm run
# test:int:up`, pour la fumigation (scripts/smoke-kits.mjs).
#
# DATABASE_URL est defini ICI, explicitement, vers le conteneur local.
# C'est indispensable : `next start` charge .env par-dessus l'environnement du
# shell, donc un simple `unset DATABASE_URL` laisse l'application se connecter
# a la base de PRODUCTION. DB_SSL=false neutralise le TLS, que le conteneur
# n'expose pas.
set -euo pipefail

PORT="${SMOKE_PORT:-3100}"

export DATABASE_URL="postgresql://postgres:test@localhost:55432/telecomstock_test"
export DB_SSL=false
export JWT_SECRET="${SMOKE_JWT_SECRET:-smoke_secret_local_uniquement}"
export NEXT_PUBLIC_BASE_URL="http://localhost:${PORT}"
export STRIPE_SECRET_KEY=sk_test_dummy
export STRIPE_PRICE_PRO=price_dummy
export STRIPE_PRICE_BUSINESS=price_dummy
# Aucune cle Resend : aucun e-mail ne doit partir d'une fumigation.
unset RESEND_API_KEY || true

exec npx next start -p "$PORT"
