/**
 * cron-server.mjs — Serveur cron Railway pour Copycraft
 * Tourne 24h/24 sur Railway, remplace le crontab Mac
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(msg) {
  console.log(`[${new Date().toLocaleString('fr-FR')}] ${msg}`);
}

function run(script, args = []) {
  return new Promise((resolve) => {
    log(`▶ Lancement : ${script} ${args.join(' ')}`);
    const proc = spawn('node', [path.join(__dirname, script), ...args], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    proc.on('close', (code) => {
      log(`✓ ${script} ${args.join(' ')} — exit ${code}`);
      resolve(code);
    });
    proc.on('error', (err) => {
      log(`✗ ${script} erreur: ${err.message}`);
      resolve(1);
    });
  });
}

// ─── Scheduler maison (pas de dépendance externe) ──────────────────────────
function now() {
  return new Date();
}
function pad(n) { return String(n).padStart(2, '0'); }

function scheduleDaily(hour, minute, weekdaysOnly, fn) {
  function next() {
    const n = now();
    const target = new Date(n);
    target.setHours(hour, minute, 0, 0);
    if (target <= n) target.setDate(target.getDate() + 1);
    // Si weekdaysOnly, avancer jusqu'au prochain jour de semaine (lun-sam)
    if (weekdaysOnly) {
      while (target.getDay() === 0) { // 0 = dimanche
        target.setDate(target.getDate() + 1);
      }
    }
    const delay = target - n;
    log(`⏰ Prochain ${pad(hour)}h${pad(minute)} dans ${Math.round(delay/60000)} min`);
    setTimeout(async () => {
      // Vérifier jour
      const d = now().getDay();
      if (!weekdaysOnly || d !== 0) {
        await fn();
      }
      next(); // reprogrammer
    }, delay);
  }
  next();
}

function scheduleHourly(fn) {
  function next() {
    const n = now();
    const target = new Date(n);
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + 1);
    const delay = target - n;
    setTimeout(async () => {
      await fn();
      next();
    }, delay);
  }
  next();
}

const SECTEURS = ['estheticienne', 'restaurant', 'salon_coiffure', 'spa', 'clinique_esthetique', 'architecte_interieur'];

// ─── Campagnes 8h00 lun-sam ────────────────────────────────────────────────
scheduleDaily(8, 0, true, async () => {
  log('═══ CAMPAGNES 8h00 ═══');
  for (const s of SECTEURS) {
    await run('campaign-full.mjs', [s]);
  }
});

// ─── Relances 8h30 lun-sam ────────────────────────────────────────────────
scheduleDaily(8, 30, true, async () => {
  log('═══ RELANCES 8h30 ═══');
  for (const s of SECTEURS) {
    await run('relance.mjs', [s]);
  }
});

// ─── Emails influenceurs 9h lun-sam ──────────────────────────────────────
scheduleDaily(9, 0, true, async () => {
  log('═══ INFLUENCEURS 9h00 ═══');
  await run('email-influenceur.mjs');
});

// ─── Check replies 9h + 18h tous les jours ───────────────────────────────
scheduleDaily(9, 5, false, async () => {
  log('═══ CHECK REPLIES 9h05 ═══');
  await run('check-replies.mjs');
});
scheduleDaily(18, 0, false, async () => {
  log('═══ CHECK REPLIES 18h00 ═══');
  await run('check-replies.mjs');
});

// ─── Sync CRM toutes les heures ──────────────────────────────────────────
scheduleHourly(async () => {
  log('═══ SYNC CRM ═══');
  await run('sync-crm.mjs');
});

// ─── Enrichissement Hunter 22h ───────────────────────────────────────────
scheduleDaily(22, 0, false, async () => {
  log('═══ ENRICH LEADS 22h00 ═══');
  await run('enrich-leads.mjs');
});

// ─── Serveur HTTP keep-alive (Railway exige un port ouvert) ──────────────
import http from 'http';
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Copycraft cron OK — ' + new Date().toLocaleString('fr-FR'));
}).listen(PORT, () => {
  log(`🚀 Cron server démarré sur port ${PORT}`);
  log(`📅 Horaires : campagnes 8h, relances 8h30, influenceurs 9h, replies 9h+18h, sync /h, enrich 22h`);
});
