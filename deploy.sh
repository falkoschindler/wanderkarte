#!/bin/sh
# Lädt die Seite per rsync über SSH ins Webroot von muellwandern-muenster.de.
#   ./deploy.sh      hochladen
#   ./deploy.sh -n   Probelauf: nur anzeigen, was sich ändern würde
# Ziel steht in .deploy.env (nicht im Repo), z. B.:
#   DEPLOY_TARGET="ssh-w0123456@w0123456.kasserver.com:/www/htdocs/w0123456/muellwandern-muenster.de/"
set -eu
cd "$(dirname "$0")"

FILES="index.html style.css script.js termine.json glascontainer.json .htaccess bilder team grafik fonts vendor"

[ -f .deploy.env ] || { echo "Fehlt: .deploy.env mit DEPLOY_TARGET=… (siehe Kopf von deploy.sh)" >&2; exit 1; }
. ./.deploy.env
: "${DEPLOY_TARGET:?DEPLOY_TARGET in .deploy.env setzen}"

# Live soll immer einem Commit entsprechen: keine uncommitteten Änderungen an hochgeladenen Dateien.
if [ -n "$(git status --porcelain -- $FILES)" ]; then
  echo "Uncommittete Änderungen – erst committen:" >&2
  git status --short -- $FILES >&2
  exit 1
fi

DRY=""
[ "${1:-}" = "-n" ] && DRY="--dry-run"

# --delete räumt nur innerhalb der hochgeladenen Ordner auf (z. B. gelöschte Fotos),
# andere Dateien im Webroot bleiben unberührt.
# shellcheck disable=SC2086
rsync -rltvz --delete --chmod=D755,F644 $DRY $FILES "$DEPLOY_TARGET"

[ -n "$DRY" ] && echo "Probelauf – nichts hochgeladen." || echo "Live: $(git log -1 --format='%h %s')"
