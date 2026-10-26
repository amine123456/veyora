#!/bin/sh
# Health checks run before and after the firewall change.
b(){ printf "%-38s %s\n" "$1" "$2"; }
b "worker -> internet" "$(docker exec crawl4ai-worker-1 curl -s -o /dev/null -w %{http_code} -m 10 https://api.ipify.org)"
b "byparr container -> internet" "$(docker exec byparr curl -s -o /dev/null -w %{http_code} -m 10 https://api.ipify.org)"
b "api container -> internet" "$(docker exec crawl4ai-api-1 node -e "fetch('https://api.ipify.org').then(r=>console.log(r.status)).catch(e=>console.log('ERR',e.cause?.code||e.message))")"
b "worker -> redis" "$(docker exec crawl4ai-worker-1 python3 -c "import socket;socket.create_connection(('redis',6379),5);print('ok')" 2>&1 | tail -1)"
b "worker -> postgres" "$(docker exec crawl4ai-worker-1 python3 -c "import socket;socket.create_connection(('postgres',5432),5);print('ok')" 2>&1 | tail -1)"
b "worker -> api" "$(docker exec crawl4ai-worker-1 curl -s -o /dev/null -w %{http_code} -m 10 http://api:3000/)"
b "host -> byparr :8192" "$(curl -s -o /dev/null -w %{http_code} -m 10 http://127.0.0.1:8192/)"
b "host -> crawl4ai api :3000" "$(curl -s -o /dev/null -w %{http_code} -m 10 http://127.0.0.1:3000/)"
b "host -> jobs-api :5002" "$(curl -s -o /dev/null -w %{http_code} -m 10 http://127.0.0.1:5002/)"
b "host -> internet" "$(curl -s -o /dev/null -w %{http_code} -m 10 https://api.ipify.org)"
b "host -> tor socks" "$(curl -s -o /dev/null -w %{http_code} -m 30 --socks5-hostname 127.0.0.1:9050 https://api.ipify.org)"
b "services" "$(systemctl is-active scraper-bot jobs-api sls-ai-amg pm2-root nginx tor@default docker | tr '\n' ' ')"
