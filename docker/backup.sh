#!/bin/sh

set -eu

OUT=/backups/auto
HOUR="${BACKUP_HOUR:-3}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
PREFIX="${BACKUP_PREFIX:-prod}"
REMOTE="${BACKUP_REMOTE:-}"
REMOTE_KEEP="${BACKUP_REMOTE_KEEP_DAYS:-90}"
RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"
CHECK_DAY="${BACKUP_RESTORE_CHECK_DAY:-0}"
export RCLONE_CONFIG="${RCLONE_CONFIG:-/backups/rclone.conf}"

mkdir -p "$OUT"

log() {
  echo "[backup] $(date '+%Y-%m-%d %H:%M:%S') $*"
}

tools() {
  if [ -n "$REMOTE" ] && ! command -v rclone > /dev/null; then apk add --no-cache --quiet rclone; fi
  if [ -n "$RECIPIENT" ] && ! command -v age > /dev/null; then apk add --no-cache --quiet age; fi
}

offsite() {
  [ -n "$REMOTE" ] || return 0
  upload="$1"
  if [ -n "$RECIPIENT" ]; then
    upload="$1.age"
    if ! age -r "$RECIPIENT" -o "$upload" "$1"; then
      rm -f "$upload"
      log "FAILED: could not encrypt $(basename "$1") for the offsite copy"
      return 1
    fi
  fi
  if rclone copy --no-traverse "$upload" "$REMOTE"; then
    log "copied $(basename "$upload") to $REMOTE"
  else
    log "FAILED: the offsite copy to $REMOTE"
  fi
  [ "$upload" = "$1" ] || rm -f "$upload"
  rclone delete --min-age "${REMOTE_KEEP}d" --include "$PREFIX-*.dump*" "$REMOTE" || log "FAILED: pruning $REMOTE"
}

restore_check() {
  target="${PGDATABASE}_restore_check"
  if ! dropdb --if-exists "$target" || ! createdb "$target"; then
    log "FAILED: the restore check could not create $target"
    return 1
  fi
  if ! pg_restore --no-owner --exit-on-error --dbname="$target" "$1" 2> /tmp/restore-check.log; then
    log "FAILED: the restore check: $(tail -n 1 /tmp/restore-check.log)"
  elif rows=$(psql --dbname="$target" -Atc "SELECT (SELECT count(*) FROM users) || ' accounts, ' || (SELECT count(*) FROM records WHERE collection = 'transactions') || ' entries'" 2> /tmp/restore-check.log); then
    log "restore check passed: $(basename "$1") restores to $rows"
  else
    log "FAILED: the restore check: the restored copy has no accounts or entries table"
  fi
  dropdb --if-exists "$target" || true
}

dump() {
  stamp="$(date +%Y%m%d-%H%M%S)"
  file="$OUT/$PREFIX-$stamp.dump"
  tmp="$file.partial"
  if ! pg_dump --format=custom --compress=6 --no-owner --file="$tmp"; then
    rm -f "$tmp"
    log "FAILED: pg_dump exited with an error"
    return 1
  fi
  if ! pg_restore --list "$tmp" > /dev/null; then
    rm -f "$tmp"
    log "FAILED: the dump could not be read back"
    return 1
  fi
  mv "$tmp" "$file"
  log "saved $file ($(du -h "$file" | cut -f1))"
  offsite "$file" || true
  if [ "${BACKUP_RESTORE_CHECK:-}" = "now" ] || [ "$(date +%w)" = "$CHECK_DAY" ]; then
    restore_check "$file" || true
  fi
  find "$OUT" -name "$PREFIX-*.dump" -type f -mtime "+$KEEP" -print -delete | while read -r old; do
    log "removed $old (older than $KEEP days)"
  done
}

took_today() {
  ls "$OUT/$PREFIX-$(date +%Y%m%d)"-*.dump > /dev/null 2>&1
}

seconds_until_next_run() {
  now_h=$(date +%H | sed 's/^0//')
  now_m=$(date +%M | sed 's/^0//')
  now_s=$(date +%S | sed 's/^0//')
  elapsed=$(( ${now_h:-0} * 3600 + ${now_m:-0} * 60 + ${now_s:-0} ))
  target=$(( HOUR * 3600 ))
  if [ "$elapsed" -lt "$target" ]; then
    echo $(( target - elapsed ))
  else
    echo $(( 86400 - elapsed + target ))
  fi
}

until pg_isready --quiet; do
  log "waiting for the database…"
  sleep 5
done

tools

if [ "${BACKUP_ONCE:-0}" = "1" ]; then
  dump
  exit $?
fi

log "daily at ${HOUR}:00, keeping ${KEEP} days in $OUT${REMOTE:+, copied to $REMOTE}"
took_today || dump || true

while :; do
  wait_s=$(seconds_until_next_run)
  log "next backup in $(( wait_s / 3600 ))h $(( wait_s % 3600 / 60 ))m"
  sleep "$wait_s"
  dump || true
done
