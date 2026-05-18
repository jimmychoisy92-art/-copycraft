// stats.mjs — Dashboard CRM Copycraft
// Usage: node stats.mjs

import fs from 'fs';

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

const leads = loadJSON('./leads-all.json', []);
const log   = loadJSON('./campaign-log.json', { sentEmails: [] });

const today = new Date().toISOString().split('T')[0];
const sent  = log.sentEmails.filter(e => e.status === 'sent');

// ─── STATS GLOBALES ───────────────────────────────────────────────────────────

const statutCount = {};
for (const l of leads) {
  const s = l.statut || 'non_contacté';
  statutCount[s] = (statutCount[s] || 0) + 1;
}

const totalAvecEmail = leads.filter(l => l.email).length;
const totalSansEmail = leads.filter(l => !l.email).length;

// ─── STATS PAR SECTEUR ────────────────────────────────────────────────────────

const secteurStats = {};
for (const l of leads) {
  if (!secteurStats[l.secteur]) secteurStats[l.secteur] = { total: 0, avecEmail: 0, envoyes: 0, repondus: 0, bounces: 0, chauds: 0 };
  const s = secteurStats[l.secteur];
  s.total++;
  if (l.email) s.avecEmail++;
  if (['j0_envoyé','j3_relance','j7_relance','répondu','vendu','payé'].includes(l.statut)) s.envoyes++;
  if (l.statut === 'répondu') s.repondus++;
  if (l.statut === 'bounce')  s.bounces++;
  if (l.statut === 'intéressé' || l.statut === 'rdv_planifié') s.chauds++;
}

// ─── PIPELINE COMMERCIAL ─────────────────────────────────────────────────────

const pipeline = {
  envoyés:      leads.filter(l => l.statut === 'j0_envoyé').length,
  j3_relance:   leads.filter(l => l.statut === 'j3_relance').length,
  j7_relance:   leads.filter(l => l.statut === 'j7_relance').length,
  répondus:     leads.filter(l => l.statut === 'répondu').length,
  intéressés:   leads.filter(l => l.statut === 'intéressé').length,
  rdv:          leads.filter(l => l.statut === 'rdv_planifié').length,
  vendus:       leads.filter(l => l.statut === 'vendu').length,
  payés:        leads.filter(l => l.statut === 'payé').length,
  bounces:      leads.filter(l => l.statut === 'bounce').length,
  refus:        leads.filter(l => l.statut === 'refus').length,
};

// ─── ENVOIS DU JOUR ───────────────────────────────────────────────────────────

const sentToday = sent.filter(e => e.date?.startsWith(today));
const secteurToday = {};
for (const e of sentToday) {
  secteurToday[e.secteur] = (secteurToday[e.secteur] || 0) + 1;
}

// ─── CA POTENTIEL ────────────────────────────────────────────────────────────

const PRIX = { A: 149, B: 149, C: 99, D: 299, E: 249, F: 299, G: 349 };
const emailTypeCount = {};
for (const e of sent) {
  if (e.emailType) emailTypeCount[e.emailType] = (emailTypeCount[e.emailType] || 0) + 1;
}

// ─── AFFICHAGE ────────────────────────────────────────────────────────────────

const line = '─'.repeat(52);
const bold = s => `\x1b[1m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const orange = s => `\x1b[33m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const gray = s => `\x1b[90m${s}\x1b[0m`;

console.log(`\n${bold('╔══════════════════════════════════════════════════════╗')}`);
console.log(`${bold('║         COPYCRAFT — DASHBOARD CRM                   ║')}`);
console.log(`${bold('╚══════════════════════════════════════════════════════╝')}`);
console.log(gray(`  ${new Date().toLocaleString('fr-FR')}\n`));

console.log(bold('  BASE DE DONNÉES'));
console.log(line);
console.log(`  Total leads          ${bold(leads.length.toString().padStart(6))}`);
console.log(`  Avec email           ${green(totalAvecEmail.toString().padStart(6))}`);
console.log(`  Sans email           ${gray(totalSansEmail.toString().padStart(6))}`);
console.log(`  Emails envoyés       ${bold(sent.length.toString().padStart(6))}`);
console.log(`  Envoyés aujourd'hui  ${orange(sentToday.length.toString().padStart(6))}`);

console.log(`\n${bold('  PIPELINE COMMERCIAL')}`);
console.log(line);
console.log(`  En attente J+3       ${orange(pipeline.envoyés.toString().padStart(6))}`);
console.log(`  En attente J+7       ${orange(pipeline.j3_relance.toString().padStart(6))}`);
console.log(`  Terminé (J+7 envoyé) ${gray(pipeline.j7_relance.toString().padStart(6))}`);
console.log(`  Répondus             ${green(pipeline.répondus.toString().padStart(6))}`);
console.log(`  Intéressés           ${green(pipeline.intéressés.toString().padStart(6))}`);
console.log(`  RDV planifiés        ${green(pipeline.rdv.toString().padStart(6))}`);
console.log(`  Vendus               ${bold(green(pipeline.vendus.toString().padStart(6)))}`);
console.log(`  Payés                ${bold(green(pipeline.payés.toString().padStart(6)))}`);
console.log(`  Bounces              ${red(pipeline.bounces.toString().padStart(6))}`);
console.log(`  Refus                ${red(pipeline.refus.toString().padStart(6))}`);

console.log(`\n${bold('  PAR SECTEUR')}`);
console.log(line);
console.log(`  ${'Secteur'.padEnd(22)} ${'Emails'.padStart(6)} ${'Envoyés'.padStart(7)} ${'Répondus'.padStart(8)} ${'Bounces'.padStart(7)}`);
console.log(gray(`  ${'─'.repeat(50)}`));
for (const [s, v] of Object.entries(secteurStats).sort((a,b) => b[1].avecEmail - a[1].avecEmail)) {
  const taux = v.envoyes > 0 ? `${Math.round(v.repondus/v.envoyes*100)}%` : '-';
  console.log(`  ${s.padEnd(22)} ${v.avecEmail.toString().padStart(6)} ${v.envoyes.toString().padStart(7)} ${(v.repondus+' ('+taux+')').padStart(8)} ${v.bounces.toString().padStart(7)}`);
}

console.log(`\n${bold('  ENVOIS AUJOURD\'HUI')}`);
console.log(line);
if (Object.keys(secteurToday).length === 0) {
  console.log(gray('  Aucun envoi aujourd\'hui'));
} else {
  for (const [s, n] of Object.entries(secteurToday)) {
    console.log(`  ${s.padEnd(26)} ${orange(n + '/30')}`);
  }
}

console.log(`\n${bold('  DISTRIBUTION EMAILS')}`);
console.log(line);
for (const [type, count] of Object.entries(emailTypeCount).sort()) {
  const prix = PRIX[type] || 0;
  const ca = count * prix;
  console.log(`  Email ${type}  ${count.toString().padStart(4)} envoyés  →  CA potentiel ${orange(ca + '€')} (${prix}€/client)`);
}

const caTotalMin = Object.entries(emailTypeCount).reduce((acc, [t,c]) => acc + c*(PRIX[t]||0), 0);
const tauxConv = 0.03;
console.log(gray(`\n  Taux conversion cold email estimé : 3%`));
console.log(`  CA potentiel total   ${bold(orange(Math.round(caTotalMin * tauxConv) + '€'))}`);

console.log(`\n${line}\n`);
