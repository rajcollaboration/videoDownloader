#!/usr/bin/env bash
# Production deploy for clipzyworld.online on a Linux VPS with Docker.
#
# Prerequisites:
#   - DNS A records for clipzyworld.online and www → this server's public IP
#   - Ports 80 and 443 open in the firewall
#   - .env copied from .env.production.example and secrets filled in
#
# Usage:
#   bash scripts/deploy-production.sh init-ssl   # first time only (Let's Encrypt)
#   bash scripts/deploy-production.sh deploy     # build & start stack
#   bash scripts/deploy-production.sh renew      # force cert renewal

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
DOMAIN="${DOMAIN:-clipzyworld.online}"
EMAIL="${CERTBOT_EMAIL:-}"

load_env() {
  if [[ ! -f .env ]]; then
    echo "Missing .env — copy .env.production.example to .env and set secrets."
    exit 1
  fi
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  EMAIL="${CERTBOT_EMAIL:-$EMAIL}"
}

require_email() {
  if [[ -z "$EMAIL" || "$EMAIL" == *"CHANGE-ME"* || "$EMAIL" == "admin@clipzyworld.online" ]]; then
    echo "Set CERTBOT_EMAIL in .env to a real email for Let's Encrypt."
    exit 1
  fi
}

init_ssl() {
  load_env
  require_email

  mkdir -p certbot/conf certbot/www

  echo "==> Starting stack with HTTP-only nginx (ACME bootstrap)..."
  NGINX_CONF=acme.conf $COMPOSE up -d --build postgres redis backend worker frontend nginx

  echo "==> Requesting certificate for $DOMAIN and www.$DOMAIN ..."
  $COMPOSE run --rm certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

  echo "==> Switching nginx to HTTPS config..."
  NGINX_CONF=production.conf $COMPOSE up -d nginx certbot

  echo "==> SSL ready. Open https://$DOMAIN"
}

deploy() {
  load_env

  if [[ ! -d certbot/conf/live/$DOMAIN ]]; then
    echo "No certificate found. Run first: bash scripts/deploy-production.sh init-ssl"
    exit 1
  fi

  echo "==> Building and starting production stack..."
  NGINX_CONF=production.conf $COMPOSE up -d --build

  echo "==> Done. Site: https://$DOMAIN"
  $COMPOSE ps
}

renew() {
  load_env
  $COMPOSE run --rm certbot renew --force-renewal
  NGINX_CONF=production.conf $COMPOSE exec nginx nginx -s reload || $COMPOSE restart nginx
  echo "==> Certificate renewed."
}

case "${1:-deploy}" in
  init-ssl) init_ssl ;;
  deploy)   deploy ;;
  renew)    renew ;;
  *)
    echo "Usage: $0 {init-ssl|deploy|renew}"
    exit 1
    ;;
esac
