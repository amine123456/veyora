#!/bin/sh
# Copies the app to the server and restarts it. Run from the proxy-provider folder:
#   sh deploy/push.sh root@157.230.28.253
# It never copies .env or data/: those live only on the server.
set -eu
TARGET="${1:?usage: sh deploy/push.sh user@host}"
# The site is a Next.js static export; the server serves web/out when SITE_DIR points at it.
(cd web && npm ci --no-audit --no-fund && npm run build)
tar -czf - package.json package-lock.json README.md src public deploy db scripts web/out \
  | ssh "$TARGET" 'set -e
      install -d -o proxora -g proxora /opt/proxora /opt/proxora/data
      rm -rf /opt/proxora/web/out
      tar -xzf - -C /opt/proxora
      chown -R root:root /opt/proxora/src /opt/proxora/public /opt/proxora/deploy /opt/proxora/db /opt/proxora/scripts /opt/proxora/web
      # Installs exactly what package-lock.json pins (pg, plus the browser packages).
      (cd /opt/proxora && npm ci --omit=dev --no-audit --no-fund)
      chown proxora:proxora /opt/proxora/data
      if systemctl cat proxora >/dev/null 2>&1; then
        systemctl restart proxora
        sleep 1
        systemctl --no-pager --lines=5 status proxora
      else
        echo "Uploaded. The proxora service is not installed yet (see deploy/DEPLOY.md step 6)."
      fi'
