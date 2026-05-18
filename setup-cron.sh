#!/usr/bin/env bash
# setup-cron.sh — Installe les cron jobs Copycraft
# Usage: bash setup-cron.sh

COPYCRAFT_DIR="/Users/jimmychoisy/dev/copycraft"
NODE_BIN="$(which node)"
LOG_DIR="$COPYCRAFT_DIR/logs"

mkdir -p "$LOG_DIR"

# Supprime les entrées copycraft existantes
(crontab -l 2>/dev/null | grep -v 'copycraft') | crontab -

# Ajoute les nouvelles entrées
(crontab -l 2>/dev/null; cat <<EOF

# ── COPYCRAFT — Campagnes 8h00 (30/secteur/jour) ──────────────────────────────
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs estheticienne >> $LOG_DIR/campaign-estheticienne.log 2>&1
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs restaurant >> $LOG_DIR/campaign-restaurant.log 2>&1
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs salon_coiffure >> $LOG_DIR/campaign-salon.log 2>&1
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs spa >> $LOG_DIR/campaign-spa.log 2>&1
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs clinique_esthetique >> $LOG_DIR/campaign-clinique.log 2>&1
0 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/campaign-full.mjs architecte_interieur >> $LOG_DIR/campaign-archi.log 2>&1

# ── COPYCRAFT — Relances 8h30 (30/secteur/jour) ───────────────────────────────
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs estheticienne >> $LOG_DIR/relance-estheticienne.log 2>&1
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs restaurant >> $LOG_DIR/relance-restaurant.log 2>&1
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs salon_coiffure >> $LOG_DIR/relance-salon.log 2>&1
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs spa >> $LOG_DIR/relance-spa.log 2>&1
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs clinique_esthetique >> $LOG_DIR/relance-clinique.log 2>&1
30 8 * * 1-6 $NODE_BIN $COPYCRAFT_DIR/relance.mjs architecte_interieur >> $LOG_DIR/relance-archi.log 2>&1
EOF
) | crontab -

echo "✅ Cron jobs installés :"
crontab -l | grep copycraft
