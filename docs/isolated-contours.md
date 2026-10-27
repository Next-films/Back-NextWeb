# Independent public and internal contours

Public host: `45.9.117.71`. Internal host: `88.201.210.92`.
The internal backend MUST remain beside the admin, downloader, short-content, monitoring,
databases and storage. They continue using their existing private configuration.
Do not point any of them at the new public backend.

## Public backend

`APP_ROLE=public` selects a separate Nest module graph before loading AppModule.
It has no TypeORM connection, database, RabbitMQ client/listener, scheduler, downloader,
Telegram, config-sync, admin/auth or signing endpoint. Only the existing Vibix, Videoseed,
Kodik catalogues and external banner provider are registered. Provider credentials come
from `.env.public.example`, not from the internal database or admin.
Startup rejects internal connection settings and non-provider API hosts.
An outage must not fall back to an internal source.

Manual banners/viewer buttons are empty; external images are validated in the frontend.
Known missing-image placeholders are excluded. Invalid images are hidden; the banner slot
keeps its compact height. There is no generic visual recognition of all possible placeholders.
Public analytics writes are disabled; internal analytics and its history remain internal.
There is no automatic publication or synchronization of clips, films, config or files.

Build the public backend with `Dockerfile.public`. Build Web-Front with
`NEXT_PUBLIC_APP_ROLE=public`, `NEXT_PUBLIC_API_BASE_URL=/api`,
`API_BASE_URL=http://public-backend:4000/api`, `API_PROXY_TARGET=http://public-backend:4000`.
The public backend hostname resolves only on the independent Docker network.
The frontend public role is a BUILD-TIME setting as well as a runtime setting.

## Cutover and rollback

1. Preserve the old nginx config, current image IDs and active internal service settings.
2. Prepare `/opt/next-public` on the new server, restricted `.env.backend`, independent
   Docker network, loopback-only app ports and nginx TLS vhosts for the public domains.
3. Start and smoke-test the new stack using host overrides BEFORE changing DNS.
4. Block the opposite host in both host OUTPUT and container forwarding directions;
   preserve SSH, existing unrelated services and established management sessions.
5. Change ONLY A records for `next-films.ru`, `www.next-films.ru`, `server.next-films.ru`.
   Update/remove stale AAAA records if no public IPv6 address is provisioned.
   Leave admin, downloader, media, monitoring and shorts domains on the internal host.
6. Verify authoritative DNS, TLS, catalogue lists/detail/player, banner behavior, and
   admin/install/short-content independently. Only then stop the old public frontend.
7. Configure CI separately: existing dev deploys target the INTERNAL host, and must never
   overwrite public credentials or switch public DNS. Public deployment requires its own job.

Rollback before stopping the old frontend: restore the three DNS records to the old host.
Internal data is never migrated/deleted; no destructive cleanup is part of cutover.
Network blocks require explicit removal to permit future inter-contour communication.

## Independent deployment and network rules

The public workflows build images in GitHub Actions and stream the exact commit-tagged image
to the public host over pinned-host-key SSH. No Docker registry login, API provider keys,
internal database or internal server access is required by the public host's deploy script.
`/opt/next-public/deploy-image.sh backend|front COMMIT_SHA` checks readiness and restores
the previous image on failure. It never touches the internal host or the other service.
Web-Front's old dev/prod jobs are disabled unless `ENABLE_LEGACY_FRONT_DEPLOY=true` is
explicitly set. The backend's existing internal deployment remains separate.

Each host runs `next-isolate-contours@public.service` or
`next-isolate-contours@internal.service`. It blocks traffic to/from the exact opposite IPv4
in INPUT, OUTPUT and Docker forwarding, plus the public host IPv6 on the internal server.
No shared Docker network, database or volume exists. An already established administrative
SSH session may finish; NEW SSH connections between the hosts are also blocked.
Close bootstrap SSH tunnels after verification. New server IPs must be added to the rules
before use. Do not restore a full iptables backup over unrelated applications.

The public runtime is stateless: unlike the internal backend, it needs no database at all.
Internal admin, installer and shorts retain their database, files and original URLs.
Their configuration changes do not propagate to the public ENV.

Public TLS uses an independent Let's Encrypt account and the `next-public` certificate
lineage. nginx reads `/etc/letsencrypt/live/next-public/{fullchain,privkey}.pem`.
`certbot.timer` renews it locally; the saved deploy hook reloads nginx. The initial
certificate transfer was only for bootstrap and is not used by active nginx anymore.
An explicit `renewal-hooks/deploy/next-public-reload` also validates/reloads nginx for
this certificate lineage. ACME staging IPv6 timed out while IPv4 returned 200, so
only certbot uses `/usr/local/sbin/next-certbot-ipv4` through a systemd drop-in.
No system-wide IPv6, DNS, provider clients or unrelated services are modified.
The IPv4-only simulated renewal passed for all three public domains, including reload
hooks, after contour isolation was enabled.
Vibix `VIBIX_PUBLISHER_ID` must also be available at frontend RUNTIME (not just build).
Compose supplies the current public publisher ID; an explicit local ENV overrides it.
The deploy readiness script rejects a frontend with a missing publisher ID.

## Cutover completed 2026-10-27

- Public DNS: apex, www and API A records point to `45.9.117.71`; no AAAA records.
- Public containers run as non-root `node`; only loopback ports 3000/4000 are published.
- Public frontend/backend workflows and the existing internal backend workflow completed.
- Real Vibix catalogue, Videoseed fallback and Kodik anime/dramas were verified.
- Kodik's API now returns `kodikplayer.com`; backend allowlist and frontend CSP include it.
- Browser homepage screenshot verified compact cropping and populated external images.
- On the internal host the old frontend is stopped with restart disabled. Old public
  nginx vhosts are replaced by `retired-public.nginx.conf` returning 410, NOT a cross-host
  proxy. Admin remains 200; internal backend, installer, shorts and monitoring remain up.
- Old nginx configs and public certificate renewal configs are preserved in
  `/home/deploy/backups/next-contours-20261027`. No media/database data was deleted.
- Both isolation systemd units are enabled and active. Public-container and host probes
  to the internal IPv4 were rejected; the site stayed 200. Bootstrap SSH session closed.

Future communication requires explicit firewall changes, credentials and application
configuration. Changing an admin setting on the internal host alone cannot connect
or update the public runtime.
