#!/usr/bin/env bash
set -euo pipefail

release="${1:?release is required}"
archive="${2:-/tmp/webba-erp-crm-deploy.tgz}"

domain="crm.webba.site"
base="/opt/crm-webba-erp"
release_dir="$base/releases/$release"
shared_dir="$base/shared"
compose_file="docker-compose.crm.yml"
project_name="crm_webba_erp"

api_port="3910"
web_port="3911"

mkdir -p "$release_dir" "$shared_dir"
tar -xzf "$archive" -C "$release_dir"
chown -R kalleu:kalleu "$base"

if [ ! -f "$shared_dir/.env" ]; then
  db_password="$(openssl rand -hex 24)"
  cat > "$shared_dir/.env" <<ENV
COMPOSE_PROJECT_NAME=$project_name
CRM_DB_USER=crm_webba
CRM_DB_PASSWORD=$db_password
CRM_DB_NAME=crm_webba
PUBLIC_API_URL=https://$domain/api
ENV
fi

if [ ! -f "$shared_dir/.env.app" ]; then
  jwt_secret="$(openssl rand -hex 48)"
  portal_secret="$(openssl rand -hex 48)"
  whatsapp_secret="$(openssl rand -hex 32)"
  cat > "$shared_dir/.env.app" <<ENV
NODE_ENV=production
PORT=3000
JWT_SECRET=$jwt_secret
PORTAL_JWT_SECRET=$portal_secret
WHATSAPP_SESSION_SECRET=$whatsapp_secret
SWAGGER_BASIC_USER=
SWAGGER_BASIC_PASSWORD=
QUEUE_DRIVER=bullmq
REMINDER_SENDER=whaileys
FRONTEND_URL=https://$domain
PIX_KEY=
PIX_MERCHANT_NAME=WEBBA ERP
PIX_MERCHANT_CITY=SAO PAULO
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=no-reply@$domain
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
NFE_SANDBOX=true
LOG_LEVEL=info
ENV
fi

ln -sfn "$shared_dir/.env" "$release_dir/.env"
ln -sfn "$shared_dir/.env.app" "$release_dir/.env.app"
ln -sfn "$release_dir" "$base/current"
chown -h kalleu:kalleu "$base/current" "$release_dir/.env" "$release_dir/.env.app"

cd "$release_dir"

docker compose -f "$compose_file" --project-name "$project_name" build app
docker compose -f "$compose_file" --project-name "$project_name" build --no-cache web
docker compose -f "$compose_file" --project-name "$project_name" up -d postgres redis

for container in crm-webba-postgres crm-webba-redis; do
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
      break
    fi
    sleep 2
  done
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")"
  if [ "$status" != "healthy" ] && [ "$status" != "running" ]; then
    echo "$container did not become ready; status=$status" >&2
    exit 1
  fi
done

docker compose -f "$compose_file" --project-name "$project_name" run --rm app npx prisma db push --accept-data-loss
docker compose -f "$compose_file" --project-name "$project_name" run --rm app node prisma/seed.cjs
docker compose -f "$compose_file" --project-name "$project_name" up -d app web

for url in "http://127.0.0.1:$api_port/health" "http://127.0.0.1:$web_port/"; do
  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null; then
      break
    fi
    sleep 2
  done
  curl -fsS "$url" >/dev/null
done

nginx_conf="/etc/nginx/conf.d/$domain.conf"
if [ -f "$nginx_conf" ]; then
  cp "$nginx_conf" "$nginx_conf.bak.$release"
fi

cat > "$nginx_conf" <<NGINX
server {
    listen 80;
    server_name $domain;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $domain;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;

    client_max_body_size 25m;

    location = /api {
        return 308 /api/;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$api_port/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }

    location = /sw.js {
        proxy_pass http://127.0.0.1:$web_port/sw.js;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:$web_port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location / {
        proxy_pass http://127.0.0.1:$web_port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    }
}
NGINX

nginx -t
systemctl reload nginx

if [ -d "/releases/$release" ]; then
  rmdir "/releases/$release" 2>/dev/null || true
  rmdir /releases 2>/dev/null || true
fi
if [ -d /shared ]; then
  rmdir /shared 2>/dev/null || true
fi

docker compose -f "$compose_file" --project-name "$project_name" ps
echo "Deployed $domain release $release"
