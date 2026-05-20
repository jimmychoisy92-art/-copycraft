// enrich-leads.mjs — Enrichit les leads sans email via Hunter.io
// Usage: node enrich-leads.mjs
// Lance automatiquement cette nuit à 22h via cron

import fs from 'fs';

const LEADS_FILE  = './leads-all.json';
const HUNTER_KEY  = process.env.HUNTER_KEY;
const BATCH_SIZE  = 50;   // leads par session (limite API Hunter gratuit)
const DELAY_MS    = 1200; // 1.2s entre chaque requête

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findEmail(domain) {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_KEY}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errors) return null;

    const emails = data.data?.emails || [];
    if (emails.length === 0) return null;

    // Priorité : contact, info, hello, bonjour, accueil, puis premier trouvé
    const priority = ['contact', 'info', 'hello', 'bonjour', 'accueil', 'reservation', 'booking'];
    for (const p of priority) {
      const found = emails.find(e => e.value?.toLowerCase().includes(p));
      if (found) return found.value.toLowerCase();
    }
    return emails[0].value.toLowerCase();
  } catch {
    return null;
  }
}

async function main() {
  const leads = loadJSON(LEADS_FILE, []);
  const toEnrich = leads.filter(l => !l.email && l.domain);

  console.log(`\n🔍 ${toEnrich.length} leads sans email à enrichir`);
  console.log(`📦 Session : ${BATCH_SIZE} leads max (limite API gratuite)\n`);

  const batch = toEnrich.slice(0, BATCH_SIZE);
  let found = 0, notFound = 0;

  for (let i = 0; i < batch.length; i++) {
    const lead = leads.find(l => l.nom === batch[i].nom && l.domain === batch[i].domain);
    if (!lead) continue;

    process.stdout.write(`  [${i+1}/${batch.length}] ${lead.nom.substring(0,40).padEnd(40)} `);

    const email = await findEmail(lead.domain);

    if (email) {
      lead.email = email;
      lead.email_source = 'hunter';
      found++;
      console.log(`✓ ${email}`);
    } else {
      lead.email_enrichment_tried = true;
      notFound++;
      console.log(`— non trouvé`);
    }

    await sleep(DELAY_MS);
  }

  saveJSON(LEADS_FILE, leads);

  const remaining = leads.filter(l => !l.email && l.domain && !l.email_enrichment_tried).length;

  console.log(`\n✅ Terminé`);
  console.log(`   Emails trouvés   : ${found}`);
  console.log(`   Non trouvés      : ${notFound}`);
  console.log(`   Restants à tenter: ${remaining}`);
  console.log(`   Relancer demain pour continuer l'enrichissement\n`);
}

main().catch(console.error);
