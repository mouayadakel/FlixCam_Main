# Production Backup System (FlixCam VPS)

This repository includes a production-ready backup system designed for a VPS running the FlixCam app.

Deliverables:
- `scripts/backup.sh`: main backup runner (filesystem + DB dumps, full + incremental, retention, checksums, manifests)
- `scripts/backup-verify.sh`: integrity verification helper
- Crontab entries (below): paste-ready schedules for daily full, weekday incremental, and monthly full

## What gets backed up

### Filesystem (allowlist)
The default allowlist includes:
- `/etc`
- `/var/log`
- `/var/www`
- `/home`

Plus app-specific paths when present:
- `/home/flixcam.rent/storage`
- `/home/flixcam.rent/public_html`
- `/home/flixcam.rent/Maildir`
- `/var/lib/redis/dump.rdb`

### Filesystem exclusions (default)
To keep backups fast and small, the script excludes rebuildable/temp folders such as:
- `*/node_modules/*`
- `*/.next/*`
- `*/.cache/*`
- `*/tmp/*`, `*/temp/*`

You can override include/exclude behavior via environment variables (see below).

### Databases (auto-detected)
The script will attempt to dump local databases based on installed client tools:
- Postgres: `pg_dump`, `psql` (and `pg_dumpall` for globals if available)
- MySQL/MariaDB: `mysqldump`, `mysql`
- MongoDB: only if `mongodump` exists (not detected on this host by default)

DB dumps are staged under `db/` inside the archive.

## Where backups are stored

Backups are stored under:
- `/backup/daily`
- `/backup/weekly`
- `/backup/monthly`

Plus metadata:
- `/backup/logs` (per-run logs)
- `/backup/manifests` (JSON manifest per run)
- `/backup/snapshots` (tar incremental snapshot files)

Permissions are set to `0700` on these directories.

## One-time setup

### 1) Create and mount the destination
Strong recommendation: mount `/backup` on a separate disk/volume with sufficient capacity.

The script will create directories if missing, but you should create the mount and set ownership:

```bash
sudo mkdir -p /backup
sudo chown root:root /backup
sudo chmod 0700 /backup
```

### 2) Configure database credentials (root-only)

The script does not store credentials. Use standard client credential files:

#### Postgres: `/root/.pgpass` (0600)
```text
localhost:5432:*:flixcam:YOUR_PASSWORD
```

Then:
```bash
sudo chmod 0600 /root/.pgpass
```

#### MySQL/MariaDB: `/root/.my.cnf` (0600)
```ini
[client]
user=root
password=YOUR_PASSWORD
```

Then:
```bash
sudo chmod 0600 /root/.my.cnf
```

### 3) (Optional) Create a root-only backup env file
This keeps cron clean and avoids putting values in the crontab.

Example: `/etc/backup/backup.env` (permissions `0600`):
```bash
BACKUP_ROOT=/backup
MAIL_TO=no-reply@flixcam.rent
MIN_FREE_GB=10
RETENTION_DAILY_DAYS=30
RETENTION_WEEKLY_DAYS=84
RETENTION_MONTHLY_DAYS=365
```

## Running backups manually

Daily full (gzip, fast):
```bash
sudo /home/flixcam.rent/scripts/backup.sh --daily --full
```

Weekday incremental (gzip, based on the latest daily snapshot):
```bash
sudo /home/flixcam.rent/scripts/backup.sh --weekly --incremental
```

Monthly full (bzip2, smaller):
```bash
sudo /home/flixcam.rent/scripts/backup.sh --monthly --full
```

Dry-run (prints commands):
```bash
sudo /home/flixcam.rent/scripts/backup.sh --daily --full --dry-run
```

## Cron configuration (paste-ready)

This schedule matches the plan:
- Monthly full on the 1st at 02:00
- Daily full at 02:00 (except the 1st)
- Weekday incremental Mon–Fri at 14:00

Paste into `sudo crontab -e`:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Optional: central config (recommended)
# The scripts support env overrides; source a root-only env file if present.

# Monthly full backup (bzip2) on the 1st at 02:00
0 2 1 * * . /etc/backup/backup.env 2>/dev/null || true; /home/flixcam.rent/scripts/backup.sh --monthly --full >>/backup/logs/cron-monthly.log 2>&1

# Daily full backup (gzip) at 02:00 on days 2-31
0 2 2-31 * * . /etc/backup/backup.env 2>/dev/null || true; /home/flixcam.rent/scripts/backup.sh --daily --full >>/backup/logs/cron-daily.log 2>&1

# Weekday incremental (gzip) Mon-Fri at 14:00
0 14 * * 1-5 . /etc/backup/backup.env 2>/dev/null || true; /home/flixcam.rent/scripts/backup.sh --weekly --incremental >>/backup/logs/cron-weekly-incremental.log 2>&1
```

Notes:
- Email notifications are sent by the script using `sendmail` to `$MAIL_TO` (default `no-reply@flixcam.rent`).\n+- If you prefer incrementals instead of daily full, change the schedule to weekly full + daily incrementals and keep monthly full on the 1st.

## Verification

Verify a backup archive:
```bash
sudo /home/flixcam.rent/scripts/backup-verify.sh /backup/daily/backup-daily-full-YYYYmmdd-HHMMSS-host.tar.gz
```

This checks:
- `sha256sum -c` against the `.sha256` file (when present)\n+- `tar -tf` readability\n+- best-effort index comparison to `.index.txt`

## Recovery procedures

### A) Filesystem restore (selective)
Extract a single file from a gz backup:
```bash
mkdir -p /tmp/restore-test
tar -xzf /backup/daily/<archive>.tar.gz -C /tmp/restore-test etc/ssh/sshd_config
```

Restore a full subtree:
```bash
tar -xzf /backup/daily/<archive>.tar.gz -C /tmp/restore-test home/flixcam.rent/storage/uploads
```

### B) Postgres restore

Inside the extracted backup staging (or by extracting `db/postgres/*`), you should see:
- `db/postgres/globals.sql` (if `pg_dumpall` exists)
- `db/postgres/<dbname>.dump` (custom format, recommended)

Restore globals:
```bash
psql -f globals.sql postgres
```

Restore a database from `.dump`:
```bash
pg_restore -C -d postgres flixcam_rent.dump
```

### C) MySQL restore

MySQL dumps are written as `db/mysql/<dbname>.sql.gz` by default.

Restore:
```bash
gunzip -c mydb.sql.gz | mysql mydb
```

## Security notes
- Backups include secrets in `/etc` and application `.env` files under `/home`. Keep `/backup` **root-only** and ideally on an encrypted volume.\n+- Do not sync backups to public buckets without server-side encryption + private ACLs.\n+- Consider adding offsite replication as a separate step once local backups are stable (rsync to another server, S3 with SSE-KMS, etc.).

