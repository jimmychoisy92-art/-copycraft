// sync-crm.mjs — Synchronise les events Railway → leads-all.json
// Usage: node sync-crm.mjs
// Cron: toutes les heures

import fs from 'fs';

const RAILWAY_URL = 'https://wemeet-server-production.up.railway.app';
const RAILWAY_SECRET = 'copycraft2024';
const LEADS_FILE = './leads-all.json';
const LOG_FILE   = './campaign-log.json';

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function main() {
  // 1. Récupérer les events depuis Railway (vide la queue)
  let events = [];
  try {
    const res = await fetch(`${RAILWAY_URL}/copycraft/events?secret=${RAILWAY_SECRET}`);
    const data = await res.json();
    events = data.events || [];
  } catch (e) {
    console.error('❌ Impossible de contacter Railway :', e.message);
    process.exit(1);
  }

  if (events.length === 0) {
    console.log('✅ Aucun event à synchroniser');
    return;
  }

  console.log(`📥 ${events.length} event(s) reçu(s)`);

  const leads = loadJSON(LEADS_FILE, []);
  const log   = loadJSON(LOG_FILE, { sentEmails: [] });

  // Index email → lead
  const leadMap = {};
  for (const l of leads) {
    if (l.email) leadMap[l.email.toLowerCase()] = l;
  }

  let updated = 0;

  for (const ev of events) {
    const email = ev.email?.toLowerCase();
    const lead  = email ? leadMap[email] : null;
    const date  = new Date(ev.ts).toISOString().split('T')[0];

    if (ev.event === 'open') {
      if (lead) {
        lead.date_ouverture = date;
        if (!lead.nb_ouvertures) lead.nb_ouvertures = 0;
        lead.nb_ouvertures++;
        updated++;
        console.log(`  👁  Ouverture : ${email}`);
      }
      log.sentEmails.push({ email, nom: ev.nom, secteur: ev.secteur, event: 'open', date: ev.ts });
    }

    if (ev.event === 'click') {
      if (lead) {
        lead.date_click = date;
        // Passer en intéressé seulement si pas déjà plus avancé
        const skipStatuts = new Set(['intéressé', 'rdv_planifié', 'vendu', 'payé', 'refus']);
        if (!skipStatuts.has(lead.statut)) {
          lead.statut = 'intéressé';
        }
        updated++;
        console.log(`  🔥 Click : ${email} → intéressé`);
      }
      log.sentEmails.push({ email, nom: ev.nom, secteur: ev.secteur, event: 'click', date: ev.ts });
    }

    if (ev.event === 'phone_capture') {
      // Ajouter comme nouveau lead chaud si pas déjà dans le CRM
      if (lead) {
        lead.telephone = ev.telephone;
        lead.statut = 'rdv_planifié';
        updated++;
        console.log(`  📞 Tel capturé : ${email} → rdv_planifié`);
      } else {
        // Nouveau lead (a rempli le formulaire sans email connu)
        const newLead = {
          nom: ev.nom || 'Inconnu',
          email: null,
          telephone: ev.telephone,
          secteur: ev.secteur || 'inconnu',
          statut: 'rdv_planifié',
          date_creation: date,
          source: 'landing',
        };
        leads.push(newLead);
        updated++;
        console.log(`  📞 Nouveau lead tel : ${ev.telephone} (${ev.nom})`);
      }
      log.sentEmails.push({ telephone: ev.telephone, nom: ev.nom, secteur: ev.secteur, event: 'phone_capture', date: ev.ts });
    }
  }

  if (updated > 0) {
    saveJSON(LEADS_FILE, leads);
    saveJSON(LOG_FILE, log);
    console.log(`\n✅ ${updated} lead(s) mis à jour dans ${LEADS_FILE}`);
  } else {
    console.log('\n✅ Aucun lead à mettre à jour (emails non trouvés dans la base)');
  }
}

main().catch(console.error);
