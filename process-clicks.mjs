/**
 * process-clicks.mjs — Traite les emails "Lien cliqué" et bounces récents
 * Usage: node process-clicks.mjs
 */

import { ImapFlow } from 'imapflow';
import fs from 'fs';

const LEADS_FILE = './leads-all.json';

function loadJSON(f, fb) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } }
function saveJSON(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

const BOUNCE_FROM = ['mailer-daemon', 'postmaster', 'mail delivery subsystem'];
const BOUNCE_SUBJECTS = ['undelivered', 'undeliverable', 'delivery failed', 'delivery failure', 'mail delivery', 'returned to sender', 'échec', 'non remis', 'mailer-daemon'];

function isBounceMail(from, subject) {
  const f = (from || '').toLowerCase();
  const s = (subject || '').toLowerCase();
  return BOUNCE_FROM.some(p => f.includes(p)) || BOUNCE_SUBJECTS.some(p => s.includes(p));
}

function extractEmail(str) {
  const m = (str||'').match(/<([^>]+)>/) || (str||'').match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : null;
}

function extractBouncedEmail(body) {
  const m = body.match(/(?:to|recipient|destinataire)[^:]*:\s*<?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})>?/i)
    || body.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : null;
}

async function main() {
  const leads = loadJSON(LEADS_FILE, []);
  const leadMap = {};
  for (const l of leads) { if (l.email) leadMap[l.email.toLowerCase()] = l; }

  const client = new ImapFlow({
    host: 'ssl0.ovh.net',
    port: 993,
    secure: true,
    auth: { user: 'contact@thecopycraft.fr', pass: process.env.SMTP_PASS },
    logger: false,
  });

  const clickCounts = {}; // nom → count
  const clickEmails = []; // uids to delete after
  const bounceUids = [];
  let changed = 0;

  try {
    await client.connect();
    const mb = await client.mailboxOpen('INBOX');
    console.log(`📬 ${mb.exists} messages dans INBOX`);

    for await (const msg of client.fetch('1:*', { envelope: true, source: true, uid: true })) {
      const from    = msg.envelope?.from?.[0]?.address || '';
      const subject = msg.envelope?.subject || '';
      const body    = msg.source?.toString() || '';
      const uid     = msg.uid;

      // "🔥 Lien cliqué" (auto-envoyé depuis thecopycraft.fr)
      if (subject.includes('Lien') && (subject.includes('cliqué') || subject.includes('clique'))) {
        // Extraire le nom du sujet "🔥 Lien cliqué — My Blend"
        const nomMatch = subject.match(/[—\-–]\s*(.+)$/);
        const nom = nomMatch ? nomMatch[1].trim() : subject;
        clickCounts[nom] = (clickCounts[nom] || 0) + 1;
        clickEmails.push(uid);
        continue;
      }

      // Bounce
      if (isBounceMail(from, subject)) {
        const bouncedEmail = extractBouncedEmail(body);
        console.log(`  ↩ Bounce uid=${uid} : ${bouncedEmail}`);
        if (bouncedEmail && leadMap[bouncedEmail]) {
          const lead = leadMap[bouncedEmail];
          if (lead.statut !== 'bounce') {
            lead.statut = 'bounce';
            lead.email_invalide = true;
            lead.date_bounce = new Date().toISOString().split('T')[0];
            changed++;
            console.log(`    ✓ Marqué bounce dans CRM : ${lead.nom}`);
          }
        }
        bounceUids.push(uid);
      }
    }

    // Traiter les clicks : trouver les leads correspondants
    console.log('\n🔥 Leads qui ont cliqué :');
    for (const [nom, count] of Object.entries(clickCounts)) {
      console.log(`  ${nom} : ${count} click(s)`);

      // Chercher dans les leads par nom
      const lead = leads.find(l =>
        l.nom && l.nom.toLowerCase().includes(nom.toLowerCase().split(' ')[0].toLowerCase())
      ) || leads.find(l =>
        nom.toLowerCase().includes((l.nom || '').toLowerCase().split(' ')[0].toLowerCase()) && l.nom
      );

      if (lead) {
        console.log(`    → Lead trouvé : ${lead.nom} (${lead.email})`);
        lead.statut = 'lead_chaud';
        lead.clicks = (lead.clicks || 0) + count;
        lead.date_click = new Date().toISOString().split('T')[0];
        if (!lead.notes) lead.notes = '';
        const today = new Date().toLocaleDateString('fr-FR');
        lead.notes = `[${today}] 🔥 ${count} click(s) sur le lien CTA\n` + lead.notes;
        changed++;
      } else {
        console.log(`    ⚠ Lead non trouvé pour "${nom}" — à traiter manuellement`);
      }
    }

    // Supprimer les emails click + bounce
    const toDelete = [...new Set([...clickEmails, ...bounceUids])];
    if (toDelete.length > 0) {
      console.log(`\n🗑 Suppression de ${toDelete.length} emails (clicks + bounces)...`);
      await client.messageDelete(toDelete.map(uid => ({ uid })), { uid: true });
      console.log('✓ Emails supprimés');
    }

    await client.logout();
  } catch (err) {
    console.error('❌ IMAP erreur :', err.message);
    process.exit(1);
  }

  if (changed > 0) {
    saveJSON(LEADS_FILE, leads);
    console.log(`\n✅ ${changed} leads mis à jour dans ${LEADS_FILE}`);
  } else {
    console.log('\n✅ Aucun changement nécessaire');
  }

  // Résumé
  console.log('\n═══ RÉSUMÉ ═══');
  console.log('Leads chauds (ont cliqué) :');
  for (const [nom, count] of Object.entries(clickCounts)) {
    console.log(`  🔥 ${nom} — ${count} click(s)`);
  }
  console.log(`Bounces supprimés : ${bounceUids.length}`);
}

main().catch(console.error);
