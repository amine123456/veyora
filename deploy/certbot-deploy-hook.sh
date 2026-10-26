#!/bin/sh
# Installed as /etc/letsencrypt/renewal-hooks/deploy/proxora.sh.
# Certbot runs it after every issue or renewal: copy the gateway certificate where the
# service user can read it, then restart so the gateway loads it.
set -eu
DOMAIN="gate.proxora.example"
case " ${RENEWED_DOMAINS:-$DOMAIN} " in
  *" $DOMAIN "*) ;;
  *) exit 0 ;;
esac
install -d -o proxora -g proxora -m 700 /opt/proxora/certs
install -o proxora -g proxora -m 600 "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" /opt/proxora/certs/fullchain.pem
install -o proxora -g proxora -m 600 "/etc/letsencrypt/live/$DOMAIN/privkey.pem" /opt/proxora/certs/privkey.pem
# Restart only once the service exists (the first certificate is issued before it is installed).
if systemctl cat proxora >/dev/null 2>&1; then systemctl restart proxora; fi
