#!/bin/sh
set -eu
# Only this certificate belongs to the isolated public site.
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/next-public ]; then
  nginx -t -q
  systemctl reload nginx
fi
