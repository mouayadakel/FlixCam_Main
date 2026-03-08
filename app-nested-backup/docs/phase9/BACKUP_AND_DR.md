# Backup & Disaster Recovery (Phase 9.2)

## Database (PostgreSQL)

- **Frequency:** Daily full backup recommended; transaction log backup for point-in-time recovery if supported.
- **Tooling:** Use provider backups (e.g. managed DB) or `pg_dump` on a schedule.
- **Retention:** Keep at least 7 daily, 4 weekly.
- **Restore:** Document restore procedure and RTO/RPO; test periodically.

## Application & Env

- **Code:** Git is source of truth; tag releases.
- **Secrets:** Stored in env / secret manager; never in repo. Backup secret list (keys only, not values) in secure place.
- **Media/Uploads:** If using Cloudinary or S3, enable versioning and cross-region replication as needed.

## Recovery

- **RTO target:** Define (e.g. 4 hours for full recovery).
- **RPO target:** Define (e.g. 1 hour data loss acceptable).
- **Runbook:** Document steps: restore DB, redeploy app, verify integrations, smoke tests.
