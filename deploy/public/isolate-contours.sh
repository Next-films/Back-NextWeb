#!/bin/sh
# Install on BOTH hosts. Reapplied after Docker starts; only these two peers are affected.
set -eu
case "${1:-}" in
  public) peer=88.201.210.92; peer6=; output_port=--dport; input_port=--sport ;;
  internal) peer=45.9.117.71; peer6=2a01:e5c0:4c8d::2; output_port=--sport; input_port=--dport ;;
  *) echo 'Usage: isolate-contours.sh public|internal' >&2; exit 2 ;;
esac

for chain in NEXT-CONTOUR-IN NEXT-CONTOUR-OUT NEXT-CONTOUR-FWD; do
  iptables -w -N "$chain" 2>/dev/null || true
  iptables -w -F "$chain"
done
# Preserve ONLY an already established administrative SSH transfer session.
# New SSH sessions between peers are NOT permitted; no application ports are exempted.
iptables -w -A NEXT-CONTOUR-IN -p tcp "$input_port" 8742 -m conntrack --ctstate ESTABLISHED -j RETURN
iptables -w -A NEXT-CONTOUR-IN -j REJECT
iptables -w -A NEXT-CONTOUR-OUT -p tcp "$output_port" 8742 -m conntrack --ctstate ESTABLISHED -j RETURN
iptables -w -A NEXT-CONTOUR-OUT -j REJECT
iptables -w -A NEXT-CONTOUR-FWD -j REJECT

iptables -w -C INPUT -s "$peer" -j NEXT-CONTOUR-IN 2>/dev/null || iptables -w -I INPUT 1 -s "$peer" -j NEXT-CONTOUR-IN
iptables -w -C OUTPUT -d "$peer" -j NEXT-CONTOUR-OUT 2>/dev/null || iptables -w -I OUTPUT 1 -d "$peer" -j NEXT-CONTOUR-OUT
iptables -w -C DOCKER-USER -s "$peer" -j NEXT-CONTOUR-FWD 2>/dev/null || iptables -w -I DOCKER-USER 1 -s "$peer" -j NEXT-CONTOUR-FWD
iptables -w -C DOCKER-USER -d "$peer" -j NEXT-CONTOUR-FWD 2>/dev/null || iptables -w -I DOCKER-USER 1 -d "$peer" -j NEXT-CONTOUR-FWD

# Public host also has IPv6. Internal host currently has no global IPv6 addresses.
if [ -n "$peer6" ]; then
  ip6tables -w -C INPUT -s "$peer6" -j REJECT 2>/dev/null || ip6tables -w -I INPUT 1 -s "$peer6" -j REJECT
  ip6tables -w -C OUTPUT -d "$peer6" -j REJECT 2>/dev/null || ip6tables -w -I OUTPUT 1 -d "$peer6" -j REJECT
  ip6tables -w -C FORWARD -s "$peer6" -j REJECT 2>/dev/null || ip6tables -w -I FORWARD 1 -s "$peer6" -j REJECT
  ip6tables -w -C FORWARD -d "$peer6" -j REJECT 2>/dev/null || ip6tables -w -I FORWARD 1 -d "$peer6" -j REJECT
fi
# Update exact peer addresses BEFORE provisioning additional public IPs.
# Never flush host-wide or unrelated Docker rules.
