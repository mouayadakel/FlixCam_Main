#!/usr/bin/env bash
#
# Production backup script (filesystem + DB dumps) with:
# - Full + incremental tar backups (tar --listed-incremental)
# - Postgres + MySQL auto-detection and logical dumps
# - SHA256 checksums, manifest metadata, and index listings
# - Locking (flock), disk space checks, retention cleanup
# - Email notifications via local sendmail
#
# Intended usage:
#   scripts/backup.sh --daily --full
#   scripts/backup.sh --weekly --incremental
#   scripts/backup.sh --monthly --full
#
# Configuration:
#   - Override via environment variables (recommended: source a root-only env file in cron)
#   - No credentials are stored in this script.
#
# DB credential files (recommended):
#   - Postgres: /root/.pgpass (0600) OR peer auth as postgres user
#   - MySQL:    /root/.my.cnf (0600)
#
set -euo pipefail

#######################################
# Defaults (override via env)
#######################################
BACKUP_ROOT="${BACKUP_ROOT:-/backup}"
BACKUP_TMP="${BACKUP_TMP:-$BACKUP_ROOT/tmp}"
BACKUP_LOGS="${BACKUP_LOGS:-$BACKUP_ROOT/logs}"
BACKUP_MANIFESTS="${BACKUP_MANIFESTS:-$BACKUP_ROOT/manifests}"
BACKUP_CHECKSUMS="${BACKUP_CHECKSUMS:-$BACKUP_ROOT/checksums}"
BACKUP_SNAPSHOTS="${BACKUP_SNAPSHOTS:-$BACKUP_ROOT/snapshots}"

DAILY_DIR="${DAILY_DIR:-$BACKUP_ROOT/daily}"
WEEKLY_DIR="${WEEKLY_DIR:-$BACKUP_ROOT/weekly}"
MONTHLY_DIR="${MONTHLY_DIR:-$BACKUP_ROOT/monthly}"

LOCK_FILE="${LOCK_FILE:-/var/lock/backup.lock}"
MIN_FREE_GB="${MIN_FREE_GB:-10}"
MIN_FREE_INODES_PERCENT="${MIN_FREE_INODES_PERCENT:-5}"

# Retention windows (days)
RETENTION_DAILY_DAYS="${RETENTION_DAILY_DAYS:-30}"
RETENTION_WEEKLY_DAYS="${RETENTION_WEEKLY_DAYS:-84}"   # ~12 weeks
RETENTION_MONTHLY_DAYS="${RETENTION_MONTHLY_DAYS:-365}" # ~12 months

# Email notifications (local MTA)
MAIL_TO="${MAIL_TO:-no-reply@flixcam.rent}"
MAIL_FROM="${MAIL_FROM:-root@$(hostname -f 2>/dev/null || hostname)}"

# Which directories to include in filesystem backup
# Keep this as an allowlist; exclude patterns handle large rebuildables.
INCLUDE_PATHS_DEFAULT=(
  "/etc"
  "/var/log"
  "/var/www"
  "/home"
)

# Extra app-specific paths (optional but recommended for this host)
EXTRA_PATHS_DEFAULT=(
  "/home/flixcam.rent/storage"
  "/home/flixcam.rent/public_html"
  "/home/flixcam.rent/Maildir"
  "/var/lib/redis/dump.rdb"
)

# Exclude patterns (tar --exclude uses shell-style wildcards)
EXCLUDE_PATTERNS_DEFAULT=(
  "*/node_modules/*"
  "*/.next/*"
  "*/.cache/*"
  # Only exclude typical app temp folders under /home; do NOT exclude /backup/tmp staging.
  "home/*/tmp/*"
  "home/*/temp/*"
)

# Compression defaults per backup type
DAILY_COMPRESSION="${DAILY_COMPRESSION:-gz}"     # gz or bz2
WEEKLY_COMPRESSION="${WEEKLY_COMPRESSION:-gz}"   # gz or bz2
MONTHLY_COMPRESSION="${MONTHLY_COMPRESSION:-bz2}" # gz or bz2

# Snapshot strategy:
# - Daily full resets DAILY_SNAR, weekday incremental uses the same DAILY_SNAR
# - Monthly full resets MONTHLY_SNAR (separate)
DAILY_SNAR="${DAILY_SNAR:-$BACKUP_SNAPSHOTS/daily.snar}"
MONTHLY_SNAR="${MONTHLY_SNAR:-$BACKUP_SNAPSHOTS/monthly.snar}"

# DB dump toggles
ENABLE_POSTGRES="${ENABLE_POSTGRES:-auto}" # auto|true|false
ENABLE_MYSQL="${ENABLE_MYSQL:-auto}"      # auto|true|false

# DB dump output naming
PG_DUMP_FORMAT="${PG_DUMP_FORMAT:-custom}" # custom (pg_dump -Fc) or plain
MYSQL_DUMP_GZIP="${MYSQL_DUMP_GZIP:-true}"

#######################################
# CLI args
#######################################
BACKUP_SET=""     # daily|weekly|monthly
BACKUP_MODE=""    # full|incremental
DRY_RUN="false"

usage() {
  cat <<'EOF'
Usage:
  backup.sh (--daily|--weekly|--monthly) (--full|--incremental) [--dry-run]

Examples:
  scripts/backup.sh --daily --full
  scripts/backup.sh --weekly --incremental
  scripts/backup.sh --monthly --full

Environment overrides (examples):
  BACKUP_ROOT=/backup
  MAIL_TO=ops@yourdomain.com
  MIN_FREE_GB=50
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --daily|--weekly|--monthly)
      BACKUP_SET="${1#--}"
      shift
      ;;
    --full|--incremental)
      BACKUP_MODE="${1#--}"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$BACKUP_SET" || -z "$BACKUP_MODE" ]]; then
  usage >&2
  exit 2
fi

#######################################
# Helpers
#######################################
now_utc() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
ts_compact() { date -u +"%Y%m%d-%H%M%S"; }

log_file=""
run_id=""
hostname_fqdn="$(hostname -f 2>/dev/null || hostname)"

send_mail() {
  local subject="$1"
  local body="$2"

  # Use sendmail if present (it is on this host at /usr/sbin/sendmail).
  if command -v sendmail >/dev/null 2>&1; then
    {
      echo "From: ${MAIL_FROM}"
      echo "To: ${MAIL_TO}"
      echo "Subject: ${subject}"
      echo "MIME-Version: 1.0"
      echo "Content-Type: text/plain; charset=UTF-8"
      echo
      echo "${body}"
    } | sendmail -t
    return 0
  fi

  # Fallback: no mailer installed.
  echo "[WARN] sendmail not found; skipping email notification" >&2
  return 1
}

die() {
  local msg="$1"
  echo "[ERROR] $msg" >&2
  exit 1
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    die "This script must run as root (for /etc, /var/log, and DB credential files)."
  fi
}

ensure_dirs() {
  mkdir -p "$BACKUP_ROOT" "$BACKUP_TMP" "$BACKUP_LOGS" "$BACKUP_MANIFESTS" "$BACKUP_CHECKSUMS" "$BACKUP_SNAPSHOTS"
  mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"
  chmod 0700 "$BACKUP_ROOT" "$BACKUP_TMP" "$BACKUP_LOGS" "$BACKUP_MANIFESTS" "$BACKUP_CHECKSUMS" "$BACKUP_SNAPSHOTS" \
    "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR" || true
}

disk_space_check() {
  # Check free space on backup destination.
  local avail_kb
  avail_kb="$(df -Pk "$BACKUP_ROOT" | awk 'NR==2{print $4}')"
  if [[ -z "$avail_kb" ]]; then
    die "Failed to read free disk space for $BACKUP_ROOT"
  fi
  local min_kb=$(( MIN_FREE_GB * 1024 * 1024 ))
  if (( avail_kb < min_kb )); then
    die "Insufficient free space on $BACKUP_ROOT: need ${MIN_FREE_GB}GiB, have $((avail_kb / 1024 / 1024))GiB"
  fi

  # Inode check (percent free)
  local iavail itotal
  read -r iavail itotal < <(df -Pi "$BACKUP_ROOT" | awk 'NR==2{print $4, $2}')
  if [[ -n "${iavail:-}" && -n "${itotal:-}" && "$itotal" != "0" ]]; then
    local ifree_percent=$(( iavail * 100 / itotal ))
    if (( ifree_percent < MIN_FREE_INODES_PERCENT )); then
      die "Low free inodes on $BACKUP_ROOT: ${ifree_percent}% free (< ${MIN_FREE_INODES_PERCENT}%)"
    fi
  fi
}

detect_bool_auto() {
  # Args: value command
  local value="$1"
  local cmd="$2"
  if [[ "$value" == "true" ]]; then
    echo "true"
  elif [[ "$value" == "false" ]]; then
    echo "false"
  else
    if command -v "$cmd" >/dev/null 2>&1; then
      echo "true"
    else
      echo "false"
    fi
  fi
}

write_json_string() {
  # minimal JSON string escaping: backslash + quote + newline
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  echo -n "\"$s\""
}

#######################################
# Backup planning
#######################################
pick_destination_dir() {
  case "$BACKUP_SET" in
    daily) echo "$DAILY_DIR" ;;
    weekly) echo "$WEEKLY_DIR" ;;
    monthly) echo "$MONTHLY_DIR" ;;
    *) die "Unknown BACKUP_SET: $BACKUP_SET" ;;
  esac
}

pick_compression() {
  case "$BACKUP_SET" in
    daily) echo "$DAILY_COMPRESSION" ;;
    weekly) echo "$WEEKLY_COMPRESSION" ;;
    monthly) echo "$MONTHLY_COMPRESSION" ;;
    *) die "Unknown BACKUP_SET: $BACKUP_SET" ;;
  esac
}

pick_snar() {
  # Daily + weekday incrementals share DAILY_SNAR. Monthly uses MONTHLY_SNAR.
  case "$BACKUP_SET" in
    monthly) echo "$MONTHLY_SNAR" ;;
    daily|weekly) echo "$DAILY_SNAR" ;;
    *) die "Unknown BACKUP_SET: $BACKUP_SET" ;;
  esac
}

archive_ext_for() {
  local comp="$1"
  case "$comp" in
    gz) echo "tar.gz" ;;
    bz2) echo "tar.bz2" ;;
    *) die "Unknown compression: $comp (expected gz or bz2)" ;;
  esac
}

#######################################
# Main
#######################################
require_root

# Lock to prevent concurrent runs
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  die "Another backup is already running (lock: $LOCK_FILE)"
fi

ensure_dirs
disk_space_check

run_id="$(ts_compact)-${BACKUP_SET}-${BACKUP_MODE}-${hostname_fqdn}"
log_file="$BACKUP_LOGS/backup-${run_id}.log"

start_time="$(now_utc)"

{
  echo "=== Backup run start ==="
  echo "run_id=$run_id"
  echo "start_time=$start_time"
  echo "host=$hostname_fqdn"
  echo "backup_set=$BACKUP_SET"
  echo "backup_mode=$BACKUP_MODE"
  echo "backup_root=$BACKUP_ROOT"
  echo "dry_run=$DRY_RUN"
} | tee -a "$log_file"

dest_dir="$(pick_destination_dir)"
compression="$(pick_compression)"
snar_file="$(pick_snar)"
archive_ext="$(archive_ext_for "$compression")"

archive_name="backup-${BACKUP_SET}-${BACKUP_MODE}-$(ts_compact)-${hostname_fqdn}.${archive_ext}"
archive_path="${dest_dir}/${archive_name}"

stage_dir="${BACKUP_TMP}/${run_id}"
stage_db_dir="${stage_dir}/db"
stage_meta_dir="${stage_dir}/meta"

cleanup_stage() {
  # Clean stage dir on success; keep on failure for debugging
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    rm -rf "$stage_dir" || true
  else
    echo "[WARN] backup failed; leaving stage dir at $stage_dir for investigation" | tee -a "$log_file"
  fi
}
trap cleanup_stage EXIT

mkdir -p "$stage_db_dir" "$stage_meta_dir"

#######################################
# Build include/exclude lists
#######################################
include_paths=("${INCLUDE_PATHS_DEFAULT[@]}")
for p in "${EXTRA_PATHS_DEFAULT[@]}"; do
  if [[ -e "$p" ]]; then
    include_paths+=("$p")
  fi
done

exclude_args=()
for pat in "${EXCLUDE_PATTERNS_DEFAULT[@]}"; do
  exclude_args+=( "--exclude=$pat" )
done

#######################################
# Database dumps (staged)
#######################################
pg_enabled="$(detect_bool_auto "$ENABLE_POSTGRES" "pg_dump")"
mysql_enabled="$(detect_bool_auto "$ENABLE_MYSQL" "mysqldump")"

db_dump_report_file="$stage_meta_dir/db-dumps.txt"
touch "$db_dump_report_file"

dump_postgres() {
  echo "[INFO] Postgres dumps: starting" | tee -a "$log_file"

  local pg_dir="$stage_db_dir/postgres"
  mkdir -p "$pg_dir"

  # Prefer peer auth as postgres user when available.
  # This avoids failures like: "role root does not exist".
  local PSQL=(psql)
  local PG_DUMP=(pg_dump)
  local PG_DUMPALL=(pg_dumpall)
  if command -v sudo >/dev/null 2>&1; then
    if sudo -n -u postgres true >/dev/null 2>&1; then
      PSQL=(sudo -n -u postgres psql)
      PG_DUMP=(sudo -n -u postgres pg_dump)
      PG_DUMPALL=(sudo -n -u postgres pg_dumpall)
    fi
  fi

  # Globals (roles, tablespaces)
  if command -v pg_dumpall >/dev/null 2>&1; then
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[DRY] ${PG_DUMPALL[*]} --globals-only > $pg_dir/globals.sql" | tee -a "$log_file"
    else
      "${PG_DUMPALL[@]}" --globals-only > "$pg_dir/globals.sql" 2>>"$log_file" || true
    fi
    echo "postgres:globals $pg_dir/globals.sql" >> "$db_dump_report_file"
  fi

  # List DBs (exclude templates)
  local dbs
  dbs="$("${PSQL[@]}" -Atqc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;" postgres 2>>"$log_file" || true)"
  if [[ -z "$dbs" ]]; then
    echo "[WARN] Could not list Postgres databases (psql). Skipping per-db dumps." | tee -a "$log_file"
    return 0
  fi

  while IFS= read -r db; do
    [[ -z "$db" ]] && continue
    local out
    if [[ "$PG_DUMP_FORMAT" == "plain" ]]; then
      out="$pg_dir/${db}.sql"
      if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY] ${PG_DUMP[*]} $db > $out" | tee -a "$log_file"
      else
        "${PG_DUMP[@]}" "$db" > "$out" 2>>"$log_file"
      fi
    else
      out="$pg_dir/${db}.dump"
      if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY] ${PG_DUMP[*]} -Fc $db > $out" | tee -a "$log_file"
      else
        "${PG_DUMP[@]}" -Fc "$db" > "$out" 2>>"$log_file"
      fi
    fi
    echo "postgres:${db} $out" >> "$db_dump_report_file"
  done <<< "$dbs"

  echo "[INFO] Postgres dumps: done" | tee -a "$log_file"
}

dump_mysql() {
  echo "[INFO] MySQL dumps: starting" | tee -a "$log_file"

  local my_dir="$stage_db_dir/mysql"
  mkdir -p "$my_dir"

  # Prefer root-only defaults file if present.
  local MYSQL=(mysql)
  local MYSQLDUMP=(mysqldump)
  if [[ -f /root/.my.cnf ]]; then
    MYSQL=(mysql --defaults-file=/root/.my.cnf)
    MYSQLDUMP=(mysqldump --defaults-file=/root/.my.cnf)
  fi

  local dbs
  dbs="$("${MYSQL[@]}" -Nse "SHOW DATABASES;" 2>>"$log_file" || true)"
  if [[ -z "$dbs" ]]; then
    echo "[WARN] Could not list MySQL databases. Skipping MySQL dumps." | tee -a "$log_file"
    return 0
  fi

  while IFS= read -r db; do
    [[ -z "$db" ]] && continue
    case "$db" in
      information_schema|performance_schema|mysql|sys) continue ;;
    esac

    local out_sql="$my_dir/${db}.sql"
    local out="$out_sql"
    if [[ "$MYSQL_DUMP_GZIP" == "true" ]]; then
      out="${out_sql}.gz"
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[DRY] mysqldump $db > $out" | tee -a "$log_file"
    else
      if [[ "$MYSQL_DUMP_GZIP" == "true" ]]; then
        "${MYSQLDUMP[@]}" \
          --single-transaction --quick --routines --events --triggers \
          "$db" | gzip -c > "$out"
      else
        "${MYSQLDUMP[@]}" \
          --single-transaction --quick --routines --events --triggers \
          "$db" > "$out"
      fi
    fi

    echo "mysql:${db} $out" >> "$db_dump_report_file"
  done <<< "$dbs"

  echo "[INFO] MySQL dumps: done" | tee -a "$log_file"
}

if [[ "$pg_enabled" == "true" ]]; then
  dump_postgres || echo "[WARN] Postgres dump step failed; continuing" | tee -a "$log_file"
else
  echo "[INFO] Postgres dumps: disabled/not detected" | tee -a "$log_file"
fi

if [[ "$mysql_enabled" == "true" ]]; then
  dump_mysql || echo "[WARN] MySQL dump step failed; continuing" | tee -a "$log_file"
else
  echo "[INFO] MySQL dumps: disabled/not detected" | tee -a "$log_file"
fi

#######################################
# Tar build
#######################################
tar_cmd=(tar)
if [[ "$BACKUP_MODE" == "incremental" ]]; then
  tar_cmd+=( "--listed-incremental=$snar_file" )
else
  # Full backup resets snapshot file for this backup family
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY] resetting snapshot: $snar_file" | tee -a "$log_file"
  else
    rm -f "$snar_file" || true
  fi
  tar_cmd+=( "--listed-incremental=$snar_file" )
fi

tar_cmd+=( "--one-file-system" )
tar_cmd+=( "${exclude_args[@]}" )
tar_cmd+=( -C / )

case "$compression" in
  gz)
    tar_cmd+=( -czf "$archive_path" )
    ;;
  bz2)
    tar_cmd+=( -cjf "$archive_path" )
    ;;
  *)
    die "Unknown compression: $compression"
    ;;
esac

# Add staged DB dumps + metadata + include_paths
paths_for_tar=()
paths_for_tar+=( "${stage_dir#/}" )
for p in "${include_paths[@]}"; do
  # Use leading-slash paths but tar -C / needs relative names
  paths_for_tar+=( "${p#/}" )
done

echo "[INFO] Creating archive: $archive_path" | tee -a "$log_file"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY] ${tar_cmd[*]} ${paths_for_tar[*]}" | tee -a "$log_file"
else
  "${tar_cmd[@]}" "${paths_for_tar[@]}" >>"$log_file" 2>&1
fi

#######################################
# Index + checksums + manifest
#######################################
index_path="${archive_path}.index.txt"
sha_path="${archive_path}.sha256"
manifest_path="$BACKUP_MANIFESTS/manifest-${run_id}.json"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY] tar -tf $archive_path > $index_path" | tee -a "$log_file"
  echo "[DRY] sha256sum $archive_path > $sha_path" | tee -a "$log_file"
else
  tar -tf "$archive_path" > "$index_path"
  sha256sum "$archive_path" > "$sha_path"
fi

end_time="$(now_utc)"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY] write manifest: $manifest_path" | tee -a "$log_file"
else
  {
    echo "{"
    echo "  \"runId\": $(write_json_string "$run_id"),"
    echo "  \"host\": $(write_json_string "$hostname_fqdn"),"
    echo "  \"backupSet\": $(write_json_string "$BACKUP_SET"),"
    echo "  \"backupMode\": $(write_json_string "$BACKUP_MODE"),"
    echo "  \"compression\": $(write_json_string "$compression"),"
    echo "  \"archivePath\": $(write_json_string "$archive_path"),"
    echo "  \"indexPath\": $(write_json_string "$index_path"),"
    echo "  \"sha256Path\": $(write_json_string "$sha_path"),"
    echo "  \"snapshotPath\": $(write_json_string "$snar_file"),"
    echo "  \"startedAt\": $(write_json_string "$start_time"),"
    echo "  \"finishedAt\": $(write_json_string "$end_time"),"
    echo "  \"includedPaths\": ["
    for i in "${!include_paths[@]}"; do
      printf "    %s%s\n" "$(write_json_string "${include_paths[$i]}")" "$([[ $i -lt $((${#include_paths[@]} - 1)) ]] && echo "," || echo "")"
    done
    echo "  ],"
    echo "  \"excludedPatterns\": ["
    for i in "${!EXCLUDE_PATTERNS_DEFAULT[@]}"; do
      printf "    %s%s\n" "$(write_json_string "${EXCLUDE_PATTERNS_DEFAULT[$i]}")" "$([[ $i -lt $((${#EXCLUDE_PATTERNS_DEFAULT[@]} - 1)) ]] && echo "," || echo "")"
    done
    echo "  ],"
    echo "  \"dbDumpsReport\": $(write_json_string "$db_dump_report_file")"
    echo "}"
  } > "$manifest_path"
fi

#######################################
# Retention cleanup
#######################################
cleanup_retention() {
  local dir="$1"
  local days="$2"
  echo "[INFO] Retention cleanup: $dir (older than ${days} days)" | tee -a "$log_file"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY] find $dir -type f -mtime +$days -name 'backup-*.tar.*' -delete" | tee -a "$log_file"
    echo "[DRY] find $dir -type f -mtime +$days -name 'backup-*.tar.*.index.txt' -delete" | tee -a "$log_file"
    echo "[DRY] find $dir -type f -mtime +$days -name 'backup-*.tar.*.sha256' -delete" | tee -a "$log_file"
  else
    find "$dir" -type f -mtime +"$days" -name 'backup-*.tar.*' -delete || true
    find "$dir" -type f -mtime +"$days" -name 'backup-*.tar.*.index.txt' -delete || true
    find "$dir" -type f -mtime +"$days" -name 'backup-*.tar.*.sha256' -delete || true
  fi
}

cleanup_retention "$DAILY_DIR" "$RETENTION_DAILY_DAYS"
cleanup_retention "$WEEKLY_DIR" "$RETENTION_WEEKLY_DAYS"
cleanup_retention "$MONTHLY_DIR" "$RETENTION_MONTHLY_DAYS"

#######################################
# Final email + summary
#######################################
summary="$(cat <<EOF
Backup completed successfully.

Host: $hostname_fqdn
Run ID: $run_id
Started: $start_time
Finished: $end_time
Type: $BACKUP_SET ($BACKUP_MODE)
Archive: $archive_path
Index: $index_path
SHA256: $sha_path
Manifest: $manifest_path
Log: $log_file

Disk free on $BACKUP_ROOT:
$(df -h "$BACKUP_ROOT" | tail -n 1)
EOF
)"

echo "$summary" | tee -a "$log_file"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY] send mail to $MAIL_TO" | tee -a "$log_file"
else
  send_mail "[backup] OK ${hostname_fqdn} ${BACKUP_SET}/${BACKUP_MODE}" "$summary" || true
fi

echo "=== Backup run end ===" | tee -a "$log_file"
