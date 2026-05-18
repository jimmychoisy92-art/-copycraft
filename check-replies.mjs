// check-replies.mjs — Lit la boîte IMAP contact@thecopycraft.fr
// Détecte bounces et vraies réponses, met à jour leads-all.json
// Usage: node check-replies.mjs

import { ImapFlow } from 'imapflow';
import fs from 'fs';

const LEADS_FILE = './leads-all.json';
const LOG_FILE   = './campaign-log.json';

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Patterns pour détecter les bounces
const BOUNCE_SUBJECTS = [
  'undelivered', 'undeliverable', 'delivery failed', 'delivery failure',
  'mail delivery', 'returned to sender', 'échec', 'non remis',
  'mailer-daemon', 'postmaster',
];
const BOUNCE_FROM = ['mailer-daemon', 'postmaster', 'mail delivery subsystem'];

function isBounceMail(from, subject) {
  const f = (from || '').toLowerCase();
  const s = (subject || '').toLowerCase();
  return BOUNCE_SUBJECTS.some(p => s.includes(p)) || BOUNCE_FROM.some(p => f.includes(p));
}

// Extraire l'adresse email d'un header From
function extractEmail(str) {
  const match = str.match(/<([^>]+)>/) || str.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
}

// Extraire l'email bounced depuis le corps du message
function extractBouncedEmail(body) {
  const match = body.match(/(?:to|recipient|destinataire)[^:]*:\s*<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/i)
    || body.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
}

async function main() {
  const leads = loadJSON(LEADS_FILE, []);
  const log   = loadJSON(LOG_FILE, { sentEmails: [] });

  // Index email → lead
  const leadMap = {};
  for (const l of leads) {
    if (l.email) leadMap[l.email.toLowerCase()] = l;
  }

  const client = new ImapFlow({
    host: 'ssl0.ovh.net',
    port: 993,
    secure: true,
    auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
    logger: false,
  });

  let bounces = 0, replies = 0, skipped = 0;

  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    // Lire les messages non lus
    for await (const msg of client.fetch('1:*', { envelope: true, bodyStructure: true, source: true })) {
      const from    = msg.envelope?.from?.[0]?.address || '';
      const subject = msg.envelope?.subject || '';
      const body    = msg.source?.toString() || '';

      // 1. Bounce ?
      if (isBounceMail(from, subject)) {
        const bouncedEmail = extractBouncedEmail(body);
        if (bouncedEmail && leadMap[bouncedEmail]) {
          const lead = leadMap[bouncedEmail];
          if (lead.statut !== 'bounce') {
            lead.statut = 'bounce';
            bounces++;
            console.log(`  ↩ Bounce détecté : ${bouncedEmail}`);
          }
        }
        continue;
      }

      // 2. Auto-reply à ignorer ?
      const autoReplyHeaders = ['auto-submitted', 'x-auto-response-suppress'];
      const isAutoReply = subject.toLowerCase().includes('absence du bureau')
        || subject.toLowerCase().includes('out of office')
        || subject.toLowerCase().includes('automatic reply')
        || subject.toLowerCase().includes('réponse automatique');
      if (isAutoReply) { skipped++; continue; }

      // 3. Vraie réponse ?
      const senderEmail = extractEmail(from);
      if (senderEmail && senderEmail !== 'contact@thecopycraft.fr' && leadMap[senderEmail]) {
        const lead = leadMap[senderEmail];
        const skipStatuts = new Set(['vendu', 'payé', 'rdv_planifié', 'refus']);
        if (!skipStatuts.has(lead.statut)) {
          lead.statut = 'répondu';
          lead.date_reponse = new Date().toISOString().split('T')[0];
          replies++;
          console.log(`  ✉ Réponse de : ${senderEmail} (${lead.nom})`);

          // Log
          log.sentEmails.push({
            email: senderEmail,
            nom: lead.nom,
            secteur: lead.secteur,
            event: 'reply',
            date: new Date().toISOString(),
          });
        }
      }
    }

    await client.logout();

  } catch(err) {
    console.error('❌ IMAP erreur :', err.message);
  }

  // Sauvegarder
  if (bounces > 0 || replies > 0) {
    saveJSON(LEADS_FILE, leads);
    saveJSON(LOG_FILE, log);
  }

  console.log(`\n✅ Terminé — ${replies} réponses, ${bounces} bounces, ${skipped} auto-replies ignorés`);
}

main().catch(console.error);
