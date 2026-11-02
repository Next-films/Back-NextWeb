# Automatic enrollment of processed YouTube Shorts

`SocialPublishingRule.autoEnqueueYoutube` defaults to **false**. The owner can explicitly
enable it for a rule containing the YouTube group in Short Content → Publication.
Existing rules are not opted in by the migration.

Every minute (at second 30), the admin-contour worker checks the authenticated ready-file
inventory and enrolls up to 25 exports. It requires an enabled, unexpired opted-in YouTube
rule, no global publishing pause, verified Shorts metadata, an enabled source channel,
and a saved download. The media worker revalidates the exact completed revision, file,
render plan, protected subtitle intersections and disk reserve before creating an
immutable export. Originals, incomplete renders and failed/review-only jobs do not qualify.

Automatic enrollment is owner authorization, **not manual review**: the export manifest
stores `authorization: automatic`, the DB asset stores `enrollmentMode: automatic`, and
the editor's `reviewConfirmed` remains unchanged. The manual admin endpoint continues
to require explicit review confirmation. Automatic assets are eligible only for opted-in
rules; other rules continue using manual assets.

Any known video ID (including deleted/published tombstones and older revisions) is skipped
by the automatic scanner. Cross-instance advisory locking serializes automatic scanning;
the existing unique snapshot identity/DB constraints remain in force. Bad/stale candidates
are deferred for five minutes so they cannot block the rest of the inventory.

Enrollment does not change `nextRunAt`, intervals, account selection or group policy and
does not call PostMyPost. The existing publication scheduler alone submits at configured
times. Turning the option off stops future enrollment and future automatic reservations,
but does not cancel jobs already sent/scheduled. Existing provider-confirmed cleanup,
signed links and retry protections are retained.

Migration: `1793638800000-add-youtube-auto-enrollment`. Rollback refuses to discard automatic
publication history. The public cinema contour is unaffected.
