#!/bin/sh
set -eu
case "${1:-}" in
  backend) service=public-backend; container=next-public-backend; tag=next-public-backend:isolated-v1; port=4000; path=/api/health ;;
  front) service=public-front; container=next-public-front; tag=next-public-front:isolated-v1; port=3000; path=/ ;;
  *) echo 'Usage: deploy-image.sh backend|front COMMIT_SHA' >&2; exit 2 ;;
esac
revision=${2:-}
case "$revision" in ''|*[!0-9a-f]*) echo 'Invalid commit SHA' >&2; exit 2 ;; esac
test "${#revision}" -eq 40
image="$container:isolated-$revision"
cd /opt/next-public
previous=$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || true)
# CI uploads the exact image over SSH. No registry credentials live on this host.
docker image inspect "$image" >/dev/null
docker tag "$image" "$tag"
docker compose -f compose.yml up -d --no-deps "$service"
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  configured=true
  if [ "$service" = public-front ]; then
    # A deliberate maintenance response is healthy, not a reason to roll back.
    if docker exec "$container" node -e '
      const stopped = process.env.CINEMA_STATUS?.trim().toLowerCase() === "stop";
      if (!process.env.VIBIX_PUBLISHER_ID?.trim()) process.exit(1);
      fetch("http://127.0.0.1:3000/", {redirect:"manual", signal:AbortSignal.timeout(8000)}).then(r => {
        process.exit(stopped
          ? (r.status === 503 && r.headers.get("x-cinema-maintenance") === "on" ? 0 : 1)
          : (r.ok ? 0 : 1));
      }).catch(() => process.exit(1));
    '; then
      echo "Public $service ready"
      exit 0
    fi
    configured=false
  fi
  if [ "$configured" = true ] && curl --fail --silent --max-time 8 "http://127.0.0.1:$port$path" >/dev/null; then
    echo "Public $service ready"
    exit 0
  fi
  sleep 5
done
echo 'Readiness failed; restoring previous image' >&2
if [ -n "$previous" ]; then
  docker tag "$previous" "$tag"
  docker compose -f compose.yml up -d --no-deps "$service"
fi
exit 1
