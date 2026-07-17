#!/usr/bin/env bash
#
# Backup speciarium — dump de la base Postgres + archive des images (media).
# La base speciarium est a conserver (donnees non regenerables), tout comme
# les images uploadees.
#
# Usage (sur le VPS, typiquement via cron) :
#   BACKUP_DIR=/backup/current ./scripts/backup.sh
#
# Variables d'environnement :
#   BACKUP_DIR    repertoire de sortie              (defaut: /backup/current)
#   RETENTION     nb de backups a conserver / type  (defaut: 7)
#   DB_CONTAINER  nom du conteneur Postgres         (defaut: postgres_speciarium)
#
# Les identifiants DB sont lus dans l'environnement du conteneur
# (POSTGRES_USER / POSTGRES_DB) : aucun secret n'est stocke dans ce script.
#
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

APP="speciarium"
DB_CONTAINER="${DB_CONTAINER:-postgres_speciarium}"
BACKUP_DIR="${BACKUP_DIR:-/backup/current}"
RETENTION="${RETENTION:-7}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEDIA_DIR="$REPO_ROOT/src/media"
STAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

# --- Dump de la base (ecriture atomique via fichier temporaire) ---
echo "[$APP] Dump de la base ($DB_CONTAINER)..."
TMP="$BACKUP_DIR/.${APP}_db_${STAMP}.sql.gz.tmp"
if docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$TMP"; then
  mv "$TMP" "$BACKUP_DIR/${APP}_db_${STAMP}.sql.gz"
else
  rm -f "$TMP"
  echo "[$APP] ERREUR : echec du dump de la base" >&2
  exit 1
fi

# --- Archive des images ---
if [ -d "$MEDIA_DIR" ]; then
  echo "[$APP] Archive des images..."
  tar -czf "$BACKUP_DIR/${APP}_images_${STAMP}.tar.gz" -C "$REPO_ROOT/src" media
else
  echo "[$APP] ATTENTION : dossier media introuvable ($MEDIA_DIR), images ignorees" >&2
fi

# --- Retention : ne garder que les RETENTION plus recents par type ---
prune() {
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "$1" -printf '%T@ %p\n' \
    | sort -rn | tail -n +$((RETENTION + 1)) | cut -d' ' -f2- | xargs -r rm -f
}
prune "${APP}_db_*.sql.gz"
prune "${APP}_images_*.tar.gz"

echo "[$APP] Termine -> $BACKUP_DIR"
