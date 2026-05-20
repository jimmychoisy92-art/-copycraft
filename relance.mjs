// relance.mjs — Relances J+3 et J+7 automatiques
// Usage: node relance.mjs <secteur>
// Ex:    node relance.mjs estheticienne

import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const LEADS_FILE   = './leads-all.json';
const LOG_FILE     = './campaign-log.json';
const DAILY_LIMIT  = 30; // par secteur
const DELAY_MS     = 30 * 1000; // 30s entre relances

const SECTEUR_ARG = process.argv[2] || null;
if (!SECTEUR_ARG) {
  console.error('❌ Usage: node relance.mjs <secteur>');
  console.error('   Secteurs: estheticienne, restaurant, salon_coiffure, spa, clinique_esthetique, architecte_interieur');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: process.env.SMTP_PASS },
});

// ─── UTILS ────────────────────────────────────────────────────────────────────

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function daysBetween(dateStr) {
  const then = new Date(dateStr);
  const now  = new Date();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function formatDate(dateStr) {
  if (!dateStr) return 'récemment';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function encodeSubject(str) {
  return encodeURIComponent(str);
}

// ─── OFFRES PAR TYPE ──────────────────────────────────────────────────────────

const OFFRES = {
  A: {
    résumé: 'création de votre fiche Google My Business',
    prix: '149€',
    concurrent_j3: 'vos concurrents directs ont une fiche GMB optimisée — ils captent les recherches locales à votre place',
    perte_j7: 'sans fiche GMB, vous perdez en moyenne 300 à 500 visiteurs potentiels chaque mois sur votre zone',
  },
  B: {
    résumé: 'optimisation de votre fiche Google (note et avis)',
    prix: '149€',
    concurrent_j3: 'une fiche concurrente avec 50+ avis et des photos vous écrase dans les résultats Google Maps',
    perte_j7: 'une note inférieure à 4,5/5 fait fuir 40% des prospects — ce sont des réservations directement perdues',
  },
  C: {
    résumé: 'création de votre site vitrine',
    prix: '99€ (offre de lancement — prix habituel 499€)',
    concurrent_j3: 'dans votre secteur à Paris, 78% de vos concurrents ont déjà un site — vous partez avec un désavantage visible',
    perte_j7: '75% des clients vérifient le site avant de choisir un prestataire — sans site, vous perdez 3 clients sur 4 dès la recherche',
  },
  D: {
    résumé: 'amélioration de votre site (CTA et conversion)',
    prix: '299€',
    concurrent_j3: 'j\'ai regardé deux de vos concurrents directs — leurs sites ont un bouton de réservation bien visible, le vôtre n\'en a pas',
    perte_j7: 'un site sans CTA clair convertit en moyenne 2× moins que la moyenne du secteur — chaque mois sans action creuse l\'écart',
  },
  E: {
    résumé: 'création de votre présence Instagram',
    prix: '249€',
    concurrent_j3: 'plusieurs établissements de votre secteur à proximité publient régulièrement sur Instagram et engagent déjà leur audience locale',
    perte_j7: 'les enseignes locales actives sur Instagram génèrent en moyenne 20% de leurs nouvelles prises de contact via ce canal — vous passez à côté',
  },
  F: {
    résumé: 'gestion de votre compte Instagram (contenu mensuel)',
    prix: '299€/mois',
    concurrent_j3: 'j\'ai comparé votre compte à deux concurrents directs — ils publient 3 à 4 fois par semaine, votre compte n\'a plus de publication récente',
    perte_j7: 'un compte inactif est perçu comme un établissement qui ferme — 1 prospect sur 3 vérifie les réseaux avant de réserver',
  },
  G: {
    résumé: 'campagne influenceurs locaux pour votre établissement',
    prix: '349€',
    concurrent_j3: 'plusieurs enseignes de votre secteur travaillent déjà avec des micro-influenceurs locaux — leurs posts génèrent des réservations directes',
    perte_j7: 'les campagnes micro-influenceurs locaux affichent un ROI moyen de 5× — chaque semaine sans action est une opportunité donnée à vos concurrents',
  },
};

function getOffre(emailType) {
  return OFFRES[emailType] || {
    résumé: 'notre analyse de votre présence en ligne',
    prix: '',
    concurrent_j3: 'vos concurrents investissent leur présence en ligne pendant que vous attendez',
    perte_j7: 'chaque semaine d\'inaction est une opportunité donnée à vos concurrents',
  };
}

// ─── GÉNÉRATION EMAIL RELANCE VIA CLAUDE ─────────────────────────────────────

async function generateRelanceEmail(lead, relanceType, emailType, dateContact) {
  const offre = getOffre(emailType);
  const dateFormatee = formatDate(dateContact);

  let prompt;

  if (relanceType === 'j3') {
    prompt = `Génère un email HTML de relance commerciale court en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Contexte : un premier email a été envoyé le ${dateFormatee} concernant ${offre.résumé}${offre.prix ? ' (' + offre.prix + ')' : ''}.
Relance J+3 — angle concurrent : ${offre.concurrent_j3}.

CONTRAINTES STRICTES :
- Maximum 120 mots pour le corps du texte
- Vouvoiement obligatoire
- Ton sobre et direct, zéro tiret
- Pas de pression agressive, pas de formules creuses
- Citer factuellement ce qu'un concurrent fait déjà
- Ne pas juger, juste constater

STYLE HTML :
- Table-based email, fond #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc (22px bold, letter-spacing 2px), sous-titre "Audit · Copywriting · Conversion" en #e8944a (11px)
- Corps : fond blanc, padding 32px, border-radius 8px
- Bordure gauche #e8944a sur le bloc "constat concurrent" (3px solid)
- Bouton CTA : fond #1a1a1a, texte blanc, 16px bold, border-radius 4px
- Footer : fond #1a1a1a, "TheCopyCraft · contact@thecopycraft.fr · Paris" en #888

STRUCTURE :
1. "Suite à mon message du ${dateFormatee}," — une phrase sobre pour rappeler l'objet (${offre.résumé})
2. Bloc avec bordure gauche #e8944a : constat factuel sur ce qu'un concurrent fait déjà (${offre.concurrent_j3})
3. Une phrase : rappel de l'offre (${offre.résumé}${offre.prix ? ', ' + offre.prix : ''})
4. Bouton CTA : "Répondre à ce message →" — lien mailto:contact@thecopycraft.fr?subject=${encodeSubject('Suite — ' + lead.nom)}&amp;body=${encodeSubject('Bonjour,\n\nSuite à votre email du ' + dateFormatee + '...\n\nCordialement')}
5. Signature simple

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans backticks.`;

  } else {
    prompt = `Génère un email HTML de dernière relance commerciale en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Contexte : deux emails précédents sans réponse. Dernier message — relance J+7.
Chiffre de perte à mentionner : ${offre.perte_j7}.

CONTRAINTES STRICTES :
- Maximum 90 mots pour le corps du texte
- Vouvoiement obligatoire
- Ton sobre, direct, sans rancœur ni pression excessive
- Mentionner explicitement que c'est le dernier message
- Citer le chiffre de perte concrètement

STYLE HTML :
- Table-based email, fond #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc (22px bold, letter-spacing 2px), sous-titre "Audit · Copywriting · Conversion" en #e8944a (11px)
- Corps : fond blanc, padding 32px, border-radius 8px
- Bloc chiffre mis en valeur : fond #f9f9f9, border-left 3px solid #c0392b, padding 12px 16px
- Bouton CTA : fond #1a1a1a, texte blanc, border-radius 4px
- Footer : fond #1a1a1a, "TheCopyCraft · contact@thecopycraft.fr · Paris" en #888

STRUCTURE :
1. "C'est mon dernier message." — phrase d'ouverture
2. Bloc avec bordure gauche rouge : le chiffre de perte (${offre.perte_j7})
3. Une phrase rappelant l'offre (${offre.résumé}${offre.prix ? ', ' + offre.prix : ''}) et que la porte reste ouverte
4. "Si le moment n'est pas opportun, je comprends tout à fait."
5. Bouton CTA : "Répondre avant la clôture →" — lien mailto:contact@thecopycraft.fr?subject=${encodeSubject('Dernier message — ' + lead.nom)}&amp;body=${encodeSubject('Bonjour,\n\nSuite à vos emails...\n\nCordialement')}
6. Signature simple

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans backticks.`;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });
      let html = response.content[0].text;
      html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
      return html;
    } catch (e) {
      if (e.status === 529 && attempt < 3) {
        console.log(`    ⏳ Claude surchargé, retry ${attempt}/3 dans 30s...`);
        await sleep(30000);
      } else {
        throw e;
      }
    }
  }
  return null;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const leads = loadJSON(LEADS_FILE, []);
  const log   = loadJSON(LOG_FILE, { sentEmails: [], days: {} });

  const today = new Date().toISOString().split('T')[0];

  // Construire un index email → log entry (dernier envoi réussi)
  const sentMap = {};
  for (const entry of log.sentEmails) {
    if (entry.status === 'sent' && entry.email) {
      if (!sentMap[entry.email] || entry.date > sentMap[entry.email].date) {
        sentMap[entry.email] = entry;
      }
    }
  }

  // Identifier leads J+3 et J+7 pour ce secteur uniquement
  const j3Leads = [];
  const j7Leads = [];

  for (const lead of leads) {
    if (!lead.email || lead.secteur !== SECTEUR_ARG) continue;

    const dateStr = lead.date_contact || lead.date_relance;
    if (!dateStr) continue;

    const days = daysBetween(dateStr);

    if (lead.statut === 'j0_envoyé' && days >= 3 && days < 4) {
      j3Leads.push(lead);
    } else if (lead.statut === 'j3_relance' && days >= 7 && days < 8) {
      j7Leads.push(lead);
    }
  }

  const total = j3Leads.length + j7Leads.length;
  console.log(`\n📬 [${SECTEUR_ARG}] Relances à traiter : ${j3Leads.length} J+3 + ${j7Leads.length} J+7 = ${total} total`);

  // Limite journalière par secteur
  const relancesToday = log.sentEmails.filter(e =>
    e.date && e.date.startsWith(today) &&
    e.status === 'sent' &&
    e.secteur === SECTEUR_ARG &&
    (e.relanceType === 'j3' || e.relanceType === 'j7')
  ).length;

  const remaining = DAILY_LIMIT - relancesToday;
  if (remaining <= 0) {
    console.log(`\n⏸️  Limite journalière atteinte pour [${SECTEUR_ARG}] (${DAILY_LIMIT} relances/jour).`);
    return;
  }

  // Traiter J+3 en priorité, puis J+7
  const queue = [
    ...j3Leads.map(l => ({ lead: l, type: 'j3' })),
    ...j7Leads.map(l => ({ lead: l, type: 'j7' })),
  ];
  const batch = queue.slice(0, remaining);

  if (batch.length === 0) {
    console.log(`\n✅ Aucune relance à envoyer pour [${SECTEUR_ARG}] aujourd'hui.`);
    return;
  }

  console.log(`🚀 Envoi de ${batch.length} relances [${SECTEUR_ARG}] (${relancesToday} déjà envoyées aujourd'hui)\n`);

  let success = 0, errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const { lead, type } = batch[i];
    const logEntry = sentMap[lead.email];
    const emailType = logEntry?.emailType || 'D';
    const dateContact = lead.date_contact || logEntry?.date;

    console.log(`[${i + 1}/${batch.length}] ${lead.nom} (${type}) — ${lead.email}`);

    try {
      console.log(`  ✍️  Génération relance ${type} (type ${emailType})...`);
      const html = await generateRelanceEmail(lead, type, emailType, dateContact);
      if (!html) throw new Error('Génération relance échouée');

      const subject = type === 'j3'
        ? `Re : ${lead.nom} — suite à mon message`
        : `Dernier message — ${lead.nom}`;

      await transporter.sendMail({
        from: '"TheCopyCraft" <contact@thecopycraft.fr>',
        to: lead.email,
        subject,
        html,
        text: type === 'j3'
          ? `Suite à mon message de récemment — je reviens brièvement vers vous.\n\nTheCopyCraft\ncontact@thecopycraft.fr`
          : `C'est mon dernier message.\n\nTheCopyCraft\ncontact@thecopycraft.fr`,
      });

      // Mettre à jour le lead
      const allLeads = loadJSON(LEADS_FILE, []);
      const idx = allLeads.findIndex(l => l.email === lead.email);
      if (idx !== -1) {
        if (type === 'j3') {
          allLeads[idx].statut = 'j3_relance';
          allLeads[idx].date_relance = today;
        } else {
          allLeads[idx].statut = 'j7_relance';
          allLeads[idx].date_relance = today;
        }
        saveJSON(LEADS_FILE, allLeads);
      }

      log.sentEmails.push({
        email: lead.email,
        nom: lead.nom,
        secteur: lead.secteur,
        emailType,
        relanceType: type,
        date: new Date().toISOString(),
        status: 'sent',
      });
      saveJSON(LOG_FILE, log);

      console.log(`  ✅ Relance ${type} envoyée — "${subject}"`);
      success++;

      if (i < batch.length - 1) {
        console.log(`  ⏳ Pause ${DELAY_MS / 1000}s...\n`);
        await sleep(DELAY_MS);
      }

    } catch (err) {
      console.log(`  ❌ Erreur : ${err.message}`);
      log.sentEmails.push({
        email: lead.email,
        nom: lead.nom,
        secteur: lead.secteur,
        relanceType: type,
        date: new Date().toISOString(),
        status: 'error',
        error: err.message,
      });
      saveJSON(LOG_FILE, log);
      errors++;
    }
  }

  console.log(`\n✅ Terminé — ${success} relances envoyées, ${errors} erreurs`);
  console.log(`📊 [${SECTEUR_ARG}] J+3 traités : ${j3Leads.length} | J+7 traités : ${j7Leads.length}`);
}

main().catch(console.error);
