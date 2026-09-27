#!/usr/bin/env bash
set -euo pipefail
cd /var/www/beat-the-fly/app
export VITE_API_URL=http://beattheflyapp.tech
npm run build

cat > /etc/nginx/sites-available/beat-the-fly <<'NGX'
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name beattheflyapp.tech www.beattheflyapp.tech _;
  root /var/www/beat-the-fly/app/dist;
  index index.html;
  client_max_body_size 5m;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~ ^/(match|stats|leaderboard)$ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
NGX

nginx -t
systemctl reload nginx

echo "baked_api:"
grep -o "beattheflyapp.tech" /var/www/beat-the-fly/app/dist/assets/*.js | head -3 || true
curl -s -o /dev/null -w "local_host:%{http_code}\n" -H "Host: beattheflyapp.tech" http://127.0.0.1/
curl -s -H "Host: beattheflyapp.tech" http://127.0.0.1/stats; echo
curl -s -o /dev/null -w "public:%{http_code}\n" http://beattheflyapp.tech/ || true
curl -s http://beattheflyapp.tech/stats || true
echo
