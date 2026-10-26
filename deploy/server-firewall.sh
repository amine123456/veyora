#!/bin/sh
# DO NOT RUN. On 2026-10-25 this made SSH hang on 157.230.28.253 (sshd MaxStartups
# throttling while ufw was on) and was rolled back from the DigitalOcean console.
# Close exposure per service instead (bind Docker ports and jobs-api to 127.0.0.1,
# stop unused services). Kept only as a record of what was tried.
echo "Refusing to run: see the warning at the top of this script." >&2
exit 1
# Enables ufw on the crawler server (157.230.28.253): blocks everything from the internet
# except SSH and web (jobs-api on 5002 stays reachable on the server itself), and stops Docker-published ports (Postgres, Redis,
# crawl4ai, byparr) from bypassing it. Arms a 5-minute auto-rollback first; cancel it
# with `systemctl stop ufw-rollback.timer` once a fresh SSH login works.
#
# Run as root on the server:  sh /root/server-firewall.sh
# Undo completely:            ufw --force disable  (and restore the printed backup folder)
set -eu
ts=$(date +%Y%m%d-%H%M%S)
backup=/root/ufw-backup-$ts
cp -a /etc/ufw "$backup"
cp /etc/default/ufw "$backup/default-ufw"
echo "backup: $backup"

# Keep forwarding exactly as today (Docker and LXC rely on it).
sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw

# Trust internal interfaces: Docker bridges, LXC bridge, DigitalOcean private network.
for f in /etc/ufw/before.rules /etc/ufw/before6.rules; do
  grep -q "proxora-firewall" "$f" && continue
  awk '{print} /^-A ufw6?-before-input -i lo -j ACCEPT$/ && !done {
    chain = ($0 ~ /ufw6-/) ? "ufw6-before-input" : "ufw-before-input"
    print "# proxora-firewall: trust internal Docker, LXC and private-network interfaces"
    print "-A " chain " -i docker0 -j ACCEPT"
    print "-A " chain " -i br-+ -j ACCEPT"
    print "-A " chain " -i lxcbr0 -j ACCEPT"
    print "-A " chain " -i eth1 -j ACCEPT"
    done = 1 }' "$f" > "$f.new" && mv "$f.new" "$f"
  grep -q "proxora-firewall" "$f" || { echo "insert failed in $f"; exit 1; }
done

# Docker publishes ports with its own rules that bypass ufw. DOCKER-USER runs first:
# drop new connections arriving from the internet (eth0) to anything forwarded.
for f in /etc/ufw/after.rules /etc/ufw/after6.rules; do
  grep -q "BEGIN docker-user" "$f" && continue
  cat >> "$f" <<'RULES'

# BEGIN docker-user: the internet cannot open new connections to Docker or other forwarded ports
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -i eth0 -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
-A DOCKER-USER -i eth0 -m conntrack --ctstate NEW -j DROP
COMMIT
# END docker-user
RULES
done

ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp comment 'ssh' >/dev/null
ufw allow 80/tcp comment 'web' >/dev/null
ufw allow 443/tcp comment 'web https' >/dev/null

# Safety net: switch the firewall off again in 5 minutes unless this timer is cancelled.
systemctl stop ufw-rollback.timer 2>/dev/null || true
systemd-run --quiet --unit=ufw-rollback --on-active=300 /usr/sbin/ufw --force disable
echo "rollback armed: firewall turns itself off in 5 minutes unless you cancel it"

ufw --force enable
ufw status verbose
echo "== DOCKER-USER"; iptables -S DOCKER-USER 2>/dev/null
