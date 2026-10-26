#!/bin/sh
# Copies the app to the server and restarts it. Run from the proxy-provider folder:
#   sh deploy/push.sh root@157.230.28.253
# It never copies .env or data/: those live only on the server.
set -eu
TARGET="${1:?usage: sh deploy/push.sh user@host}"
tar -czf - package.json README.md src public deploy \
  | ssh "$TARGET" 'set -e
      install -d -o proxora -g proxora /opt/proxora /opt/proxora/data
      tar -xzf - -C /opt/proxora
      chown -R root:root /opt/proxora/src /opt/proxora/public /opt/proxora/deploy
      chown proxora:proxora /opt/proxora/data
      if systemctl cat proxora >/dev/null 2>&1; then
        systemctl restart proxora
        sleep 1
        systemctl --no-pager --lines=5 status proxora
      else
        echo "Uploaded. The proxora service is not installed yet (see deploy/DEPLOY.md step 6)."
      fi'
