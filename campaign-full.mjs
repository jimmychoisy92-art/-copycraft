// campaign-full.mjs — Campagne complète multi-type email
// Usage: node campaign-full.mjs <secteur>
// Ex:    node campaign-full.mjs estheticienne

import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { auditLead } from './audit.mjs';
import { generateMockupScreenshots } from './mockups.mjs';
import { generateDemoForLead } from './generate-demo-site.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);
const IMG_DIR = path.join(__dirname, 'tmp_emails');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// ─── IMAGES HERO PAR SECTEUR ──────────────────────────────────────────────────
const SECTOR_IMAGES = {
  salon_coiffure:     { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=82', file: 'hero_salon.jpg' },
  estheticienne:      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=82', file: 'hero_esthet.jpg' },
  restaurant:         { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=82', file: 'hero_food.jpg' },
  spa:                { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=82', file: 'hero_spa.jpg' },
  clinique_esthetique:{ url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=82', file: 'hero_clinique.jpg' },
  architecte_interieur:{ url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=82', file: 'hero_archi.jpg' },
};

// ─── IMAGES INFLUENCEURS PAR SECTEUR ─────────────────────────────────────────
const INFLUENCER_IMAGES = {
  salon_coiffure:      [
    { url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=300&q=82', file: 'inf_salon_1.jpg', handle: '@sofia_style', abonnes: '18,4k' },
    { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=300&q=82', file: 'inf_salon_2.jpg', handle: '@lucie_beauty', abonnes: '12,1k' },
    { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=300&q=82', file: 'inf_salon_3.jpg', handle: '@maya_looks', abonnes: '9,7k' },
  ],
  estheticienne:       [
    { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&q=82', file: 'inf_esthet_1.jpg', handle: '@chloe_glow', abonnes: '22,3k' },
    { url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&q=82', file: 'inf_esthet_2.jpg', handle: '@emma_skincare', abonnes: '14,8k' },
    { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=300&q=82', file: 'inf_esthet_3.jpg', handle: '@jade_wellness', abonnes: '8,2k' },
  ],
  restaurant:          [
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=82', file: 'inf_resto_1.jpg', handle: '@paris_foodie', abonnes: '31,6k' },
    { url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=82', file: 'inf_resto_2.jpg', handle: '@lea_gourmet', abonnes: '17,9k' },
    { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=82', file: 'inf_resto_3.jpg', handle: '@thomas_eats', abonnes: '11,4k' },
  ],
  spa:                 [
    { url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&q=82', file: 'inf_spa_1.jpg', handle: '@camille_zen', abonnes: '19,2k' },
    { url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=300&q=82', file: 'inf_spa_2.jpg', handle: '@nina_relax', abonnes: '13,5k' },
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=82', file: 'inf_spa_3.jpg', handle: '@alex_detox', abonnes: '7,8k' },
  ],
  clinique_esthetique: [
    { url: 'https://images.unsplash.com/photo-1559181567-c3190bfbf383?w=300&q=82', file: 'inf_clinique_1.jpg', handle: '@julie_beaute', abonnes: '25,1k' },
    { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=82', file: 'inf_clinique_2.jpg', handle: '@sarah_glow', abonnes: '16,3k' },
    { url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&q=82', file: 'inf_clinique_3.jpg', handle: '@clara_skin', abonnes: '10,9k' },
  ],
  architecte_interieur:[
    { url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&q=82', file: 'inf_archi_1.jpg', handle: '@home_by_lea', abonnes: '28,7k' },
    { url: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=300&q=82', file: 'inf_archi_2.jpg', handle: '@deco_paris', abonnes: '15,2k' },
    { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=82', file: 'inf_archi_3.jpg', handle: '@interieurs_chic', abonnes: '9,3k' },
  ],
};

// ─── FAUX POSTS INSTAGRAM PAR SECTEUR ────────────────────────────────────────
const FAKE_POSTS = {
  restaurant: {
    postUrl:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&q=85',
    postFile:   'post_resto.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
    avatarFile: 'avatar_resto.jpg',
    handle:     'lea_gourmet',
    location:   'Paris 11ème',
    likes:      '1 243',
    reservations: 31,
    caption:    'Soirée parfaite chez <strong>@lecomptoirdumarais</strong> 🍷 Cuisine généreuse, ambiance chaleureuse — exactement ce qu\'on cherchait. Réservez avec le code <strong>LEA10</strong> pour -10% sur l\'addition. On y retourne très vite.',
    hashtags:   '#restaurant #paris #foodie #bonneadresse #diner',
    comments: [
      { user: 'mathilde_b',    text: 'on y était vendredi, c\'est vraiment excellent 😍' },
      { user: 'pierre.paris',  text: 'j\'ai réservé avec le code, merci pour le tips !' },
      { user: 'famille_morin', text: 'parfait pour notre anniversaire de mariage 🥂' },
    ],
  },
  estheticienne: {
    postUrl:    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=480&q=85',
    postFile:   'post_esthet.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80',
    avatarFile: 'avatar_esthet.jpg',
    handle:     'chloe_glow',
    location:   'Paris 8ème',
    likes:      '2 187',
    reservations: 28,
    caption:    'Soin visage chez <strong>@institutsofiaparis</strong> ✨ Peau transformée en 1h — les mains d\'une fée. Je recommande le soin éclat, le résultat est dingue. Code <strong>CHLOE15</strong> pour -15% sur votre premier soin.',
    hashtags:   '#skincare #beaute #paris #soin #glow #estheticienne',
    comments: [
      { user: 'emma_skin',      text: 'j\'ai pris rdv directement, j\'avais besoin de ça 🙌' },
      { user: 'camille_beauty', text: 'tu as une peau incroyable depuis ce soin !' },
      { user: 'inès.paris',    text: 'j\'y vais la semaine prochaine avec le code 😍' },
    ],
  },
  salon_coiffure: {
    postUrl:    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=480&q=85',
    postFile:   'post_salon.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80',
    avatarFile: 'avatar_salon.jpg',
    handle:     'sofia_style',
    location:   'Paris 17ème',
    likes:      '1 876',
    reservations: 24,
    caption:    'Nouvelle couleur chez <strong>@salonlumiereparis</strong> 💇‍♀️ C\'est exactement ce que j\'avais en tête — le coloriste a tout compris au premier essai. Code <strong>SOFIA20</strong> pour -20% sur votre première visite.',
    hashtags:   '#coiffure #coloration #paris #hair #beaute #balayage',
    comments: [
      { user: 'lucie_hair',    text: 'cette couleur te va tellement bien 😍 je prends rdv !' },
      { user: 'noemie.style',  text: 'j\'y vais la semaine prochaine, merci !' },
      { user: 'alexia_paris',  text: 'le salon est vraiment au top, j\'y suis allée hier' },
    ],
  },
  spa: {
    postUrl:    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=480&q=85',
    postFile:   'post_spa.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&q=80',
    avatarFile: 'avatar_spa.jpg',
    handle:     'camille_zen',
    location:   'Paris 16ème',
    likes:      '3 042',
    reservations: 19,
    caption:    'Journée ressourcement au <strong>@espacezenparis</strong> 🌿 Massage balinais + hammam — 3h de bulle totale. On ressort transformée. Code <strong>ZEN10</strong> pour -10% sur tout soin.',
    hashtags:   '#spa #massage #wellness #paris #detox #relaxation #zen',
    comments: [
      { user: 'julie_wellness', text: 'j\'ai réservé pour ce week-end, j\'en avais besoin 🙏' },
      { user: 'sarah.relax',   text: 'ce spa est magique, j\'y emmène ma mère pour son anniv !' },
      { user: 'manon_paris',   text: 'la photo suffit à me détendre 😂 j\'y vais !' },
    ],
  },
  clinique_esthetique: {
    postUrl:    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=480&q=85',
    postFile:   'post_clinique.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1559181567-c3190bfbf383?w=80&q=80',
    avatarFile: 'avatar_clinique.jpg',
    handle:     'julie_beaute',
    location:   'Paris 8ème',
    likes:      '4 521',
    reservations: 22,
    caption:    'Résultat 1 mois après mon traitement à la <strong>@cliniquebelleparisienne</strong> ✨ Je n\'en reviens toujours pas. Équipe au top, protocole sur mesure. Code <strong>JULIE10</strong> pour une consultation offerte.',
    hashtags:   '#skincare #esthetiquemedicale #paris #antiage #beaute #before #after',
    comments: [
      { user: 'clara_glow',   text: 'la différence est incroyable 😍 tu as l\'air de 25 ans !' },
      { user: 'sophie.paris', text: 'j\'ai pris rdv pour une consultation, merci !' },
      { user: 'anne_m',       text: 'j\'hésite depuis longtemps, là je me lance 🙌' },
    ],
  },
  architecte_interieur: {
    postUrl:    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=480&q=85',
    postFile:   'post_archi.jpg',
    avatarUrl:  'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=80&q=80',
    avatarFile: 'avatar_archi.jpg',
    handle:     'home_by_lea',
    location:   'Paris 9ème',
    likes:      '5 318',
    reservations: 14,
    caption:    'Rénovation terminée 🏠 6 semaines avec <strong>@atelierinterieurspa</strong> — du sol au plafond. Chaque détail pensé pour nous. Je ne pensais pas qu\'on pouvait autant transformer un espace. Code <strong>LEA50</strong> pour -50€ sur la première consultation.',
    hashtags:   '#interiordesign #renovation #paris #deco #architecteinterieur #homedecor',
    comments: [
      { user: 'marie.deco',    text: 'c\'est absolument magnifique 😍 tu as leur contact ?' },
      { user: 'thomas_home',   text: 'on cherche justement quelqu\'un pour notre appart !' },
      { user: 'elise_paris',   text: 'j\'ai pris rdv, ils m\'ont répondu en 2h 🙌' },
    ],
  },
};

async function getFakePostImages(secteur) {
  const post = FAKE_POSTS[secteur] || FAKE_POSTS.restaurant;
  const results = { post: null, avatar: null };
  for (const [key, cfg] of [['post', { url: post.postUrl, file: post.postFile }], ['avatar', { url: post.avatarUrl, file: post.avatarFile }]]) {
    const dest = path.join(IMG_DIR, cfg.file);
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 3000) {
      try { await execAsync(`curl -sL --max-time 15 -A "Mozilla/5.0" -o "${dest}" "${cfg.url}"`); } catch(e) {}
    }
    results[key] = (fs.existsSync(dest) && fs.statSync(dest).size > 3000)
      ? `data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}`
      : null;
  }
  return results;
}

async function getInfluencerImages(secteur) {
  const list = INFLUENCER_IMAGES[secteur] || INFLUENCER_IMAGES.restaurant;
  const result = [];
  for (const inf of list) {
    const dest = path.join(IMG_DIR, inf.file);
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 3000) {
      try {
        await execAsync(`curl -sL --max-time 15 -A "Mozilla/5.0" -o "${dest}" "${inf.url}"`);
      } catch(e) { /* skip */ }
    }
    const b64 = (fs.existsSync(dest) && fs.statSync(dest).size > 3000)
      ? `data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}`
      : null;
    result.push({ ...inf, b64 });
  }
  return result;
}

async function getHeroBase64(secteur) {
  const cfg = SECTOR_IMAGES[secteur] || SECTOR_IMAGES.restaurant;
  const dest = path.join(IMG_DIR, cfg.file);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 5000) {
    try {
      await execAsync(`curl -sL --max-time 15 -A "Mozilla/5.0" -o "${dest}" "${cfg.url}"`);
    } catch(e) { return null; }
  }
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 5000) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}`;
}

// Injecte l'image hero juste après le header (premier </tr> du HTML)
function injectHeroImage(html, base64) {
  if (!base64) return html;
  const heroRow = `\n  <tr><td style="padding:0;margin:0;line-height:0;"><img src="${base64}" alt="" width="600" style="width:100%;max-width:600px;display:block;border:0;" /></td></tr>`;
  // Cherche la fin du bloc header (premier </tr> après le header dark)
  const idx = html.indexOf('</tr>');
  if (idx === -1) return html;
  return html.slice(0, idx + 5) + heroRow + html.slice(idx + 5);
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const LEADS_FILE  = './leads-all.json';
const LOG_FILE    = './campaign-log.json';
const DAILY_LIMIT = 30;
const DELAY_MS    = 2 * 60 * 1000; // 2 min entre envois

const SECTEUR_ARG = process.argv[2] || null;
if (!SECTEUR_ARG) {
  console.error('❌ Usage: node campaign-full.mjs <secteur>');
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

function encodeSubject(str) {
  return encodeURIComponent(str);
}

// ─── GÉNÉRATION HTML VIA CLAUDE ───────────────────────────────────────────────

const EMAIL_PROMPTS = {

  A: (lead, audit) => `Génère un email HTML de prospection commerciale en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Problème détecté : l'établissement n'a pas de fiche Google My Business.
Objet souhaité : "${lead.nom} — votre établissement n'apparaît pas sur Google Maps"

STYLE HTML :
- Table-based, compatible tous clients email
- Fond global : #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc (22px bold, letter-spacing 2px), sous-titre "Audit · Copywriting · Conversion" en #999 (11px)
- Corps : fond blanc, border-radius 8px, padding 40px
- Accent couleur : #e8944a (titres de section, bordure gauche)
- Footer : fond #1a1a1a, texte blanc

TON ET RÈGLES :
- Vouvoiement obligatoire
- Sobre, direct, zéro tiret
- Pas de formules creuses ("votre retour me touche", etc.)
- Citer le nom réel de l'établissement

STRUCTURE DE L'EMAIL :
1. Accroche : "En cherchant ${lead.nom} sur Google Maps, votre établissement n'apparaît pas. Chaque jour, des clients potentiels vous cherchent et ne vous trouvent pas."
2. Bloc statistiques (3 stats en colonnes dans des cases grises arrondies) :
   - "46% des recherches Google ont une intention locale"
   - "+1000 vues/mois en moyenne pour une fiche GMB optimisée"
   - "76% des visiteurs GMB se rendent sur place dans les 24h"
3. Bloc dark (#1a1a1a, texte blanc, padding 28px, border-radius 8px) intitulé "CE QU'ON FAIT" :
   - Création complète de la fiche Google My Business
   - Rédaction de la description optimisée
   - Ajout de photos et configuration des horaires
   - Suivi des premiers avis
4. Bloc témoignage (fond #f9f5f0, bordure gauche 3px #e8944a, padding 20px, border-radius 6px) :
   Citation en italique : "Avant TheCopyCraft, mes clients ne me trouvaient pas sur Google. Depuis la création de ma fiche, j'ai 34 nouveaux rendez-vous en 6 semaines."
   Auteur en gras : "— Virginie M., esthéticienne · Paris 9e"
5. Tarif en grand : "149€" (centré, 36px, gras) — offre de lancement
6. Bouton CTA noir (background #1a1a1a, texte blanc, 16px bold, padding 16px 40px, border-radius 4px) :
   Texte : "Je veux apparaître sur Google Maps →"
   Lien : mailto:contact@thecopycraft.fr?subject=${encodeSubject('Fiche GMB ' + lead.nom)}&body=${encodeSubject('Bonjour,\n\nJe souhaite créer ma fiche Google My Business.\n\nMon établissement : ' + lead.nom + '\nMa ville : ' + (lead.ville || '') + '\nMon téléphone : \nDisponibilités : \n\nCordialement')}
7. Signature : "TheCopyCraft · contact@thecopycraft.fr · Paris" (footer #1a1a1a)

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans balises \`\`\`.`,

  B: (lead, audit) => `Génère un email HTML de prospection commerciale en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Problème détecté : fiche Google My Business trouvée mais sous-performante.
Données réelles : note ${audit.gmb.rating || 'inconnue'}/5, ${audit.gmb.reviewCount || 0} avis${audit.gmb.hasPhotos === false ? ', pas de photos' : ''}${audit.gmb.hasDescription === false ? ', pas de description' : ''}.
Objet souhaité : "Votre fiche Google — 3 points qui font fuir vos clients"

STYLE HTML :
- Table-based, compatible tous clients email
- Fond global : #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc (22px bold), sous-titre en #999
- Corps : fond blanc, border-radius 8px, padding 40px
- Accent couleur : #e8944a
- Footer : fond #1a1a1a, texte blanc

TON ET RÈGLES :
- Vouvoiement obligatoire
- Sobre, direct, zéro tiret
- Citer les vraies données (${audit.gmb.reviewCount || 0} avis, note ${audit.gmb.rating || '?'}/5)

STRUCTURE DE L'EMAIL :
1. Accroche : citer les données réelles. Ex: "Votre fiche Google affiche ${audit.gmb.reviewCount || 0} avis et une note de ${audit.gmb.rating || '?'}/5. C'est insuffisant pour apparaître en tête des recherches locales — vos concurrents avec 50+ avis vous passent devant."
2. Bloc "Les 3 points détectés" : 3 cases distinctes avec bordure gauche #e8944a listant les problèmes réels (faible nombre d'avis, description manquante si applicable, photos manquantes si applicable)
3. Bloc dark "CE QU'ON FAIT" :
   - Optimisation complète de la fiche existante
   - Rédaction d'une description qui convertit
   - Stratégie pour obtenir plus d'avis rapidement
   - Ajout de photos professionnelles (conseils)
4. Bloc témoignage (fond #f9f5f0, bordure gauche 3px #e8944a, padding 20px, border-radius 6px) :
   Citation en italique : "Ils ont optimisé notre fiche Google en 3 jours. On est passés de la 8e à la 2e position sur 'restaurant Paris 11e' — 47 nouvelles réservations le premier mois."
   Auteur en gras : "— Karim L., restaurant · Paris 11e"
5. Tarif : "149€"
6. Bouton CTA noir : "Optimiser ma fiche Google →"
   Lien : mailto:contact@thecopycraft.fr?subject=${encodeSubject('Optimisation GMB ' + lead.nom)}&body=${encodeSubject('Bonjour,\n\nJe souhaite optimiser ma fiche Google My Business.\n\nMon établissement : ' + lead.nom + '\nMon téléphone : \nDisponibilités : \n\nCordialement')}
7. Footer "TheCopyCraft · contact@thecopycraft.fr · Paris"

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans balises \`\`\`.`,

  C: null, // Email C géré séparément via generateEmailC (démo site réel + screenshot)

  D: null, // Email D géré séparément via generateEmailD (démo site réel + screenshot)

  E: (lead, audit) => `Génère un email HTML de prospection commerciale en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Contexte : bonne présence Google${audit.gmb.reviewCount ? ' (' + audit.gmb.reviewCount + ' avis' + (audit.gmb.rating ? ', ' + audit.gmb.rating + '/5' : '') + ')' : ''}, site web présent, mais pas de présence sur les réseaux sociaux.
Objet souhaité : "${lead.nom} — vos concurrents sont sur Instagram, pas vous"

STYLE HTML :
- Table-based, compatible tous clients email
- Fond global : #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc, sous-titre en #999
- Corps : fond blanc, border-radius 8px, padding 40px
- Accent couleur : #e8944a
- Footer : fond #1a1a1a, texte blanc

TON ET RÈGLES :
- Vouvoiement obligatoire
- Sobre, direct, zéro tiret
- Valoriser les points forts existants avant d'aborder le manque

STRUCTURE :
1. Accroche : valoriser la présence Google et le site, puis constater l'absence sur Instagram
2. Phrase clé : "Vos concurrents directs publient régulièrement sur Instagram et captent des clients que vous pourriez avoir."
3. Bloc "Ce que les réseaux apportent" : 3 bénéfices concrets (visibilité locale, confiance client, réservations directes)
4. Bloc dark "CE QU'ON FAIT" :
   - Création du compte Instagram professionnel
   - Stratégie de contenu sur mesure pour votre secteur
   - 12 premiers posts rédigés et planifiés
   - Guide pour maintenir l'activité seul(e) ensuite
5. Bloc témoignage (fond #f9f5f0, bordure gauche 3px #e8944a, padding 20px, border-radius 6px) :
   Citation en italique : "On n'avait aucune présence sur Instagram. TheCopyCraft a créé notre compte de A à Z — 800 abonnés en 45 jours et 12 nouvelles clientes directement venues des réseaux."
   Auteur en gras : "— Nadia B., spa · Paris 8e"
6. Tarif : "249€" — offre de lancement
7. Bouton CTA noir : "Lancer mes réseaux →"
   Lien : mailto:contact@thecopycraft.fr?subject=${encodeSubject('Réseaux sociaux ' + lead.nom)}&body=${encodeSubject('Bonjour,\n\nJe souhaite créer ma présence sur les réseaux sociaux.\n\nMon établissement : ' + lead.nom + '\nMon secteur : ' + lead.secteur + '\nMon téléphone : \nDisponibilités : \n\nCordialement')}
7. Footer

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans balises \`\`\`.`,

  F: (lead, audit) => `Génère un email HTML de prospection commerciale en français pour ${lead.nom}, un(e) ${lead.secteur} à ${lead.ville || 'Paris'}.

Contexte : compte Instagram présent mais inactif (pas de post récent détecté). GMB${audit.gmb.rating ? ' ' + audit.gmb.rating + '/5' : ''} et site web ${audit.site.status !== 'absent' ? 'présents' : 'absent'}.
Objet souhaité : "${lead.nom} — votre Instagram dort pendant que vos concurrents recrutent des clients"

STYLE HTML :
- Table-based, compatible tous clients email
- Fond global : #f4f4f4
- Header : fond #1a1a1a, "THE COPY CRAFT" en blanc, sous-titre en #999
- Corps : fond blanc, border-radius 8px, padding 40px
- Accent couleur : #e8944a
- Footer : fond #1a1a1a, texte blanc

TON ET RÈGLES :
- Vouvoiement obligatoire
- Sobre, direct, zéro tiret
- Montrer l'opportunité manquée sans juger

STRUCTURE :
1. Accroche : "Votre compte Instagram existe, mais n'est plus alimenté depuis plusieurs semaines. Pendant ce temps, vos concurrents publient et captent des clients."
2. Bloc statistiques (3 stats) :
   - "58% des consommateurs consultent Instagram avant de choisir un prestataire local"
   - "Les comptes actifs obtiennent 6× plus de visites de profil"
   - "Un post par semaine suffit à maintenir une communauté engagée"
3. Bloc dark "CE QU'ON FAIT" :
   - Audit et optimisation du profil existant
   - Création du calendrier éditorial mensuel
   - Rédaction et planification de 4 posts/semaine
   - Réponse aux commentaires et suivi des abonnés
4. Bloc témoignage (fond #f9f5f0, bordure gauche 3px #e8944a, padding 20px, border-radius 6px) :
   Citation en italique : "Notre Instagram était à l'arrêt depuis 4 mois. Depuis qu'ils gèrent notre compte, on a gagné 890 abonnés et reçu 23 réservations directement via les stories."
   Auteur en gras : "— Thomas D., restaurant · Paris 5e"
5. Tarif : "299€/mois" — engagement mensuel, résiliable à tout moment
6. Bouton CTA noir : "Relancer mon Instagram →"
   Lien : mailto:contact@thecopycraft.fr?subject=${encodeSubject('Gestion Instagram ' + lead.nom)}&body=${encodeSubject('Bonjour,\n\nJe souhaite relancer mon compte Instagram.\n\nMon établissement : ' + lead.nom + '\nMon compte Instagram : @\nMon téléphone : \nDisponibilités : \n\nCordialement')}
6. Footer

Retourne UNIQUEMENT le HTML complet, sans commentaires, sans balises \`\`\`.`,

  G: null, // Email G géré séparément via generateEmailG (vraies photos influenceurs)
};

// ─── CLAUDE ───────────────────────────────────────────────────────────────────

// ─── EMAIL D — site existant à améliorer, démo site réel + screenshot ────────

async function generateEmailD(lead, audit) {
  const siteUrl = audit.site.url || lead.website || '';
  const hasCTA = audit.site.hasCTA;

  // Génération du site démo amélioré + screenshot
  let demoUrl = null;
  let screenshotBase64 = null;
  try {
    console.log(`  🎨 Génération site démo pour email D...`);
    const demo = await generateDemoForLead(lead);
    demoUrl = demo.url;
    screenshotBase64 = demo.screenshotBase64;
  } catch (e) {
    console.log(`  ⚠️  Génération démo échouée: ${e.message}`);
  }

  // Bloc visuel : screenshot cliquable ou fallback bouton texte
  let visualBlock;
  if (demoUrl && screenshotBase64) {
    visualBlock = `
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">À quoi pourrait ressembler votre site optimisé</p>
    <a href="${demoUrl}" style="display:block;text-decoration:none;" target="_blank">
      <img src="data:image/png;base64,${screenshotBase64}"
           style="width:100%;max-width:520px;border:1px solid #eee;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,.1);display:block;margin:0 auto;"
           alt="Aperçu de votre site vitrine">
      <div style="text-align:center;margin-top:12px;">
        <span style="display:inline-block;padding:14px 32px;background:#e8944a;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
          Voir le site complet →
        </span>
      </div>
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:#aaa;text-align:center;font-style:italic;">Refonte proposée pour ${lead.nom} — 100% personnalisable</p>
  </td></tr>`;
  } else if (demoUrl) {
    visualBlock = `
  <tr><td style="padding:0 28px 24px;text-align:center;">
    <a href="${demoUrl}" style="display:inline-block;text-decoration:none;" target="_blank">
      <div style="padding:14px 32px;background:#e8944a;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
        Voir le site optimisé →
      </div>
    </a>
  </td></tr>`;
  } else {
    visualBlock = `
  <tr><td style="padding:0 28px 24px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=${encodeURIComponent('Refonte site ' + lead.nom)}"
      style="display:inline-block;background:#e8944a;color:#fff;font-size:13px;font-weight:700;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Améliorer mon site →
    </a>
  </td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:26px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:11px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Audit · Copywriting · Conversion</div>
  </td></tr>

  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 16px;font-size:21px;font-weight:900;color:#1a1a1a;line-height:1.3;">J'ai analysé le site de ${lead.nom}.<br>Voici ce qui freine probablement vos réservations.</p>
    <p style="margin:0;font-size:14px;color:#555;line-height:1.8;">URL analysée : <a href="${siteUrl}" style="color:#e8944a;">${siteUrl}</a></p>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Problèmes détectés</p>
    ${!hasCTA ? `<div style="border-left:3px solid #e8944a;padding:12px 16px;margin-bottom:10px;background:#fafafa;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#444;font-weight:700;">Aucun bouton de réservation visible</p>
      <p style="margin:4px 0 0;font-size:12px;color:#777;">Les visiteurs ne savent pas quoi faire — ils partent.</p>
    </div>` : ''}
    <div style="border-left:3px solid #e8944a;padding:12px 16px;margin-bottom:10px;background:#fafafa;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#444;font-weight:700;">Textes non optimisés pour la conversion</p>
      <p style="margin:4px 0 0;font-size:12px;color:#777;">Un visiteur décide en 8 secondes. Les mots comptent autant que le design.</p>
    </div>
    <div style="border-left:3px solid #e8944a;padding:12px 16px;background:#fafafa;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#444;font-weight:700;">Parcours client peu clair</p>
      <p style="margin:4px 0 0;font-size:12px;color:#777;">De l'arrivée sur le site jusqu'à la réservation — chaque étape compte.</p>
    </div>
  </td></tr>

  ${visualBlock}

  <tr><td style="padding:0 28px 24px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on fait</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Refonte des textes (copywriting)</p>
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Ajout d'un parcours client clair</p>
        </td>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Optimisation mobile et vitesse</p>
          <p style="margin:0;color:#fff;font-size:13px;">✓ CTA et formulaire de réservation</p>
        </td>
      </tr></table>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <div style="background:#f9f5f0;border-left:3px solid #e8944a;border-radius:6px;padding:18px 20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#444;font-style:italic;line-height:1.6;">"Mon site existait depuis 3 ans sans générer de réservations. TheCopyCraft a retravaillé les textes et ajouté un vrai parcours client — +62% de demandes en ligne en 6 semaines."</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">— Sophie R., salon de coiffure · Paris 16e</p>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#e8944a;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Refonte complète</div>
      <div style="font-size:48px;font-weight:900;color:#1a1a1a;line-height:1;">299€</div>
      <div style="font-size:13px;color:#888;margin-top:6px;">Prix unique · Sans abonnement</div>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=${encodeURIComponent('Refonte site ' + lead.nom)}&amp;body=${encodeURIComponent('Bonjour,\n\nJe souhaite améliorer mon site.\n\nMon site : ' + siteUrl + '\nMon téléphone : \nDisponibilités : \n\nCordialement')}"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Améliorer mon site →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// ─── EMAIL G — vraies photos influenceurs ─────────────────────────────────────

async function generateEmailG(lead, audit) {
  const ville = lead.ville || 'Paris';
  const influenceurs = await getInfluencerImages(lead.secteur);

  const gmb = audit.gmb.rating ? `${audit.gmb.rating}/5 (${audit.gmb.reviewCount || '?'} avis)` : '';

  const infBlocks = influenceurs.map(inf => {
    const img = inf.b64
      ? `<img src="${inf.b64}" alt="${inf.handle}" style="width:100%;height:160px;object-fit:cover;display:block;border:0;" />`
      : `<div style="height:160px;background:#333;"></div>`;
    return `
      <td style="width:32%;padding:0 4px;vertical-align:top;">
        <div style="border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15);">
          ${img}
          <div style="background:#1a1a1a;padding:8px 10px;">
            <div style="font-size:12px;font-weight:700;color:#fff;">${inf.handle}</div>
            <div style="font-size:11px;color:#e8944a;margin-top:2px;">${inf.abonnes} abonnés locaux</div>
          </div>
        </div>
      </td>`;
  }).join('');

  // Faux post Instagram par secteur
  const postData = FAKE_POSTS[lead.secteur] || FAKE_POSTS.restaurant;
  const { post: postB64, avatar: avatarB64 } = await getFakePostImages(lead.secteur);

  const postImg   = postB64   ? `<img src="${postB64}"   alt="post" style="width:100%;display:block;border:0;" />` : `<div style="height:260px;background:#222;"></div>`;
  const avatarImg = avatarB64 ? `<img src="${avatarB64}" alt="avatar" style="width:38px;height:38px;border-radius:50%;display:block;object-fit:cover;border:0;" />` : `<div style="width:38px;height:38px;border-radius:50%;background:#555;"></div>`;

  const commentsHtml = postData.comments.map(c => `
    <tr><td style="padding:3px 0;">
      <span style="font-size:12px;font-weight:700;color:#1a1a1a;">${c.user}</span>
      <span style="font-size:12px;color:#555;"> ${c.text}</span>
    </td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <!-- HEADER -->
  <tr><td style="background:#1a1a1a;padding:26px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:11px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Audit · Copywriting · Conversion</div>
  </td></tr>

  <!-- ACCROCHE -->
  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 12px;font-size:20px;font-weight:900;color:#1a1a1a;line-height:1.3;">
      ${gmb ? `${gmb} sur Google, réseaux actifs.<br>` : ''}Voici ce que des micro-influenceurs locaux font pour vos concurrents.
    </p>
    <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
      Ce post a été publié il y a 6 jours. Il a généré <strong>${postData.reservations} nouvelles réservations</strong> pour l'établissement concerné.
    </p>
  </td></tr>

  <!-- FAUX POST INSTAGRAM -->
  <tr><td style="padding:0 28px 24px;">
    <div style="border:1px solid #dbdbdb;border-radius:10px;overflow:hidden;background:#fff;">

      <!-- Header post -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 14px;">
        <tr>
          <td style="width:42px;vertical-align:middle;">${avatarImg}</td>
          <td style="padding-left:10px;vertical-align:middle;">
            <div style="font-size:13px;font-weight:700;color:#1a1a1a;">@${postData.handle}</div>
            <div style="font-size:11px;color:#888;">${postData.location} · Partenariat</div>
          </td>
          <td style="text-align:right;vertical-align:middle;font-size:18px;color:#1a1a1a;">···</td>
        </tr>
      </table>

      <!-- Photo -->
      ${postImg}

      <!-- Actions + likes -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 14px 4px;">
        <tr>
          <td><span style="font-size:22px;">♥</span><span style="font-size:22px;margin-left:10px;">💬</span><span style="font-size:22px;margin-left:10px;">↗</span></td>
          <td style="text-align:right;font-size:20px;">🔖</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:2px 14px 6px;">
        <tr><td><span style="font-size:13px;font-weight:700;color:#1a1a1a;">${postData.likes} J'aime</span></td></tr>
      </table>

      <!-- Légende -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 14px 8px;">
        <tr><td>
          <span style="font-size:13px;font-weight:700;color:#1a1a1a;">@${postData.handle} </span>
          <span style="font-size:13px;color:#1a1a1a;">${postData.caption}</span>
          <div style="margin-top:4px;font-size:13px;color:#0095f6;">${postData.hashtags}</div>
        </td></tr>
      </table>

      <!-- Commentaires -->
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:6px 14px 12px;background:#fafafa;border-top:1px solid #efefef;">
        ${commentsHtml}
        <tr><td style="padding-top:4px;"><span style="font-size:11px;color:#aaa;">il y a 6 jours</span></td></tr>
      </table>
    </div>

    <!-- Stat impact -->
    <div style="margin-top:12px;background:#f9f9f9;border-left:3px solid #e8944a;padding:12px 16px;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#555;">Ce post a généré <strong style="color:#1a1a1a;">${postData.reservations} réservations</strong> en 7 jours — sans aucune publicité payante.</p>
    </div>
  </td></tr>

  <!-- STATS ROI -->
  <tr><td style="padding:0 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;line-height:1;">5,2×</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">ROI moyen<br>micro-influenceurs</div>
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;line-height:1;">7×</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">plus d'engagement<br>vs publicité Meta</div>
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;line-height:1;">63%</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">font confiance aux<br>recommandations</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- PROFILS INFLUENCEURS -->
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Profils disponibles dans votre secteur à ${ville}</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${infBlocks}</tr></table>
    <p style="margin:10px 0 0;font-size:11px;color:#aaa;text-align:center;font-style:italic;">Audience locale vérifiée — taux d'engagement moyen 4,8%</p>
  </td></tr>

  <!-- CE QU'ON FAIT -->
  <tr><td style="padding:0 28px 24px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on fait pour vous</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Sélection de 4 influenceurs locaux</p>
          <p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Prise de contact et négociation</p>
        </td>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Brief créatif par influenceur</p>
          <p style="margin:0;color:#fff;font-size:13px;">✓ Rapport de résultats mensuel</p>
        </td>
      </tr></table>
    </div>
  </td></tr>

  <!-- PRIX -->
  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#e8944a;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Campagne clé en main</div>
      <div style="font-size:48px;font-weight:900;color:#1a1a1a;line-height:1;">349€</div>
      <div style="font-size:13px;color:#888;margin-top:6px;">Sans abonnement · Livré en 7 jours · 4 influenceurs locaux</div>
    </div>
  </td></tr>

  <!-- TÉMOIGNAGE -->
  <tr><td style="padding:0 28px 24px;">
    <div style="background:#f9f5f0;border-left:3px solid #e8944a;border-radius:6px;padding:18px 20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#444;font-style:italic;line-height:1.6;">"La campagne influenceurs a généré 340 nouvelles visites sur notre fiche Google en 3 semaines. 19 clients nous ont cité le code promo à la caisse — du jamais vu pour nous."</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">— Marc T., restaurant · Lyon 2e</p>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="https://copycraft-landing.vercel.app"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux être recontacté →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

// ─── EMAIL C — site vitrine démo réel avec screenshot ─────────────────────────

async function generateEmailC(lead, audit) {
  const avis = audit.gmb.reviewCount ? `${audit.gmb.reviewCount} avis` : '';
  const note = audit.gmb.rating ? ` ${audit.gmb.rating}/5` : '';
  const gmb_str = avis ? `${avis}${note} sur Google` : '';

  // Génération du site démo + screenshot
  let demoUrl = null;
  let screenshotBase64 = null;
  try {
    console.log(`  🎨 Génération site démo pour email C...`);
    const demo = await generateDemoForLead(lead);
    demoUrl = demo.url;
    screenshotBase64 = demo.screenshotBase64;
  } catch (e) {
    console.log(`  ⚠️  Génération démo échouée: ${e.message}`);
  }

  // Bloc visuel : screenshot cliquable ou fallback bouton texte
  let visualBlock;
  if (demoUrl && screenshotBase64) {
    visualBlock = `
  <tr><td style="padding:0 28px 28px;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici à quoi pourrait ressembler votre site</p>
    <p style="margin:0 0 20px;font-size:13px;color:#888;text-align:center;">Nous avons créé une démo personnalisée pour ${lead.nom}</p>
    <a href="${demoUrl}" style="display:block;text-decoration:none;" target="_blank">
      <img src="data:image/png;base64,${screenshotBase64}"
           style="width:100%;max-width:520px;border:1px solid #eee;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,.1);display:block;margin:0 auto;"
           alt="Aperçu de votre site vitrine">
      <div style="text-align:center;margin-top:12px;">
        <span style="display:inline-block;padding:14px 32px;background:#e8944a;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
          Voir le site complet →
        </span>
      </div>
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:#aaa;text-align:center;font-style:italic;">Site personnalisé pour ${lead.nom} — modifiable à 100%</p>
  </td></tr>`;
  } else if (demoUrl) {
    // Screenshot échoué mais URL disponible
    visualBlock = `
  <tr><td style="padding:0 28px 28px;text-align:center;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici à quoi pourrait ressembler votre site</p>
    <a href="${demoUrl}" style="display:inline-block;text-decoration:none;" target="_blank">
      <div style="padding:14px 32px;background:#e8944a;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
        Voir le site vitrine →
      </div>
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:#aaa;text-align:center;font-style:italic;">Démo personnalisée pour ${lead.nom}</p>
  </td></tr>`;
  } else {
    // Fallback complet : ancien système mockups
    try {
      const mockups = await generateMockupScreenshots(lead);
      const mockupBlocks = mockups.map(({ label, b64thumb, fullUrl }) => {
        const inner = b64thumb
          ? `<a href="${fullUrl || '#'}" target="_blank" style="display:block;line-height:0;cursor:zoom-in;text-decoration:none;">
               <img src="${b64thumb}" alt="${label}" title="Cliquez pour voir en grand" style="width:100%;display:block;max-height:200px;object-fit:cover;object-position:top;border:0;" />
               <div style="background:#222;padding:6px;text-align:center;">
                 <span style="font-size:10px;color:#e8944a;letter-spacing:0.5px;font-weight:600;">↗ Voir en grand</span>
               </div>
             </a>`
          : `<div style="height:160px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:13px;color:#999;">${label}</div>`;
        return `
          <td style="width:32%;padding:0 4px;vertical-align:top;">
            <div style="border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.12);">
              <div style="background:#1a1a1a;padding:7px 10px;text-align:center;">
                <span style="font-size:10px;color:#e8944a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</span>
              </div>
              ${inner}
            </div>
          </td>`;
      }).join('');
      visualBlock = `
  <tr><td style="padding:0 28px 28px;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici à quoi pourrait ressembler votre site</p>
    <p style="margin:0 0 20px;font-size:13px;color:#888;text-align:center;">3 directions — vous choisissez le style, on livre en 7 jours</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${mockupBlocks}</tr></table>
    <p style="margin:14px 0 0;font-size:12px;color:#aaa;text-align:center;font-style:italic;">Maquettes personnalisées pour ${lead.nom} — modifiables à 100%</p>
  </td></tr>`;
    } catch {
      visualBlock = `
  <tr><td style="padding:0 28px 28px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=${encodeURIComponent('Site web ' + lead.nom)}"
      style="display:inline-block;background:#e8944a;color:#fff;font-size:13px;font-weight:700;padding:14px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Voir le site vitrine →
    </a>
  </td></tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:26px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:11px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Audit · Copywriting · Conversion</div>
  </td></tr>

  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 16px;font-size:21px;font-weight:900;color:#1a1a1a;line-height:1.3;">${gmb_str ? `Vous avez ${gmb_str}.<br>` : ''}Vous n'avez pas de site web.</p>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">75% des clients vérifient le site d'un établissement avant de se décider. Sans site, vous perdez ces clients — même ceux qui ont trouvé votre fiche Google.</p>
  </td></tr>

  ${visualBlock}

  <tr><td style="padding:0 28px 20px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Tout est inclus</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Design sur mesure</p>
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Textes copywriting inclus</p>
          <p style="margin:0;color:#fff;font-size:13px;">✓ Formulaire de réservation</p>
        </td>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Optimisation mobile</p>
          <p style="margin:0 0 7px;color:#fff;font-size:13px;">✓ Nom de domaine 1 an</p>
          <p style="margin:0;color:#fff;font-size:13px;">✓ Hébergement 1 an</p>
        </td>
      </tr></table>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#c0392b;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Offre de lancement</div>
      <div style="font-size:18px;color:#888;text-decoration:line-through;margin-bottom:4px;">499€</div>
      <div style="font-size:48px;font-weight:900;color:#1a1a1a;line-height:1;">99€</div>
      <div style="font-size:13px;color:#e8944a;font-weight:700;margin-top:6px;">Livré en 7 jours · Clé en main</div>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <div style="background:#f9f5f0;border-left:3px solid #e8944a;border-radius:6px;padding:18px 20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#444;font-style:italic;line-height:1.6;">"On n'avait pas de site depuis l'ouverture. TheCopyCraft nous a livré un site en 6 jours — le mois suivant, 18 clients nous ont dit qu'ils avaient réservé directement depuis le site."</p>
      <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">— Laura M., esthéticienne · Paris 17e</p>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=${encodeURIComponent('Site web ' + lead.nom)}&amp;body=${encodeURIComponent('Bonjour,\n\nJe suis intéressé par la création de mon site vitrine.\n\nMon établissement : ' + lead.nom + '\nMon téléphone : \nMes disponibilités : \n\nCordialement')}"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux mon site →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;
}

async function generateEmail(lead, audit) {
  // Emails traités séparément (templates avec vraies images ou démo site)
  if (audit.emailType === 'C') return addTracking(await generateEmailC(lead, audit), lead);
  if (audit.emailType === 'D') return addTracking(await generateEmailD(lead, audit), lead);
  if (audit.emailType === 'G') return addTracking(await generateEmailG(lead, audit), lead);

  const promptFn = EMAIL_PROMPTS[audit.emailType] || EMAIL_PROMPTS.G;
  const prompt = promptFn(lead, audit);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      });

      let html = response.content[0].text;
      // Nettoyer si Claude entoure de backticks
      html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
      return addTracking(html, lead);
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

// ─── TRACKING ────────────────────────────────────────────────────────────────

const TRACKING_BASE = 'https://copycraft-landing.vercel.app';

function addTracking(html, lead) {
  const id  = encodeURIComponent(lead.email || '');
  const nom = encodeURIComponent(lead.nom || '');
  const sec = encodeURIComponent(lead.secteur || '');

  // Pixel d'ouverture
  const pixel = `<img src="${TRACKING_BASE}/api/pixel?id=${id}&nom=${nom}&secteur=${sec}" width="1" height="1" style="display:block;border:0;" />`;

  // Remplacer le lien CTA copycraft-landing par le lien tracké
  const clickUrl = `${TRACKING_BASE}/api/click?id=${id}&nom=${nom}&secteur=${sec}`;
  html = html.replace(/https:\/\/copycraft-landing\.vercel\.app(?!\/api)/g, clickUrl);

  // Injecter le pixel avant </body>
  html = html.replace('</body>', `${pixel}\n</body>`);

  return html;
}

// ─── SUJETS EMAIL ─────────────────────────────────────────────────────────────

function getEmailSubject(lead, audit) {
  const nom = lead.nom;
  switch (audit.emailType) {
    case 'A': return `${nom} — votre établissement n'apparaît pas sur Google Maps`;
    case 'B': return `Votre fiche Google — 3 points qui font fuir vos clients`;
    case 'C': return `${nom} — voici à quoi pourrait ressembler votre site`;
    case 'D': return `Votre site — quelques pistes pour plus de réservations`;
    case 'E': return `${nom} — vos concurrents sont sur Instagram, pas vous`;
    case 'F': return `${nom} — votre Instagram dort pendant que vos concurrents recrutent des clients`;
    case 'G': return `${nom} — comment vos concurrents attirent 3× plus de clients avec les influenceurs locaux`;
    default:  return `${nom} — une opportunité à saisir`;
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const leads = loadJSON(LEADS_FILE, []);
  const log   = loadJSON(LOG_FILE, { sentEmails: [], days: {} });

  // Leads éligibles
  const sentSet = new Set(log.sentEmails.map(e => e.email));
  const skipStatuts = new Set([
    'refus', 'bounce', 'sans_suite',
    'j0_envoyé', 'j3_relance', 'j7_relance',
    'répondu', 'intéressé', 'rdv_planifié', 'vendu', 'payé',
  ]);

  const eligible = leads.filter(l =>
    l.email &&
    !sentSet.has(l.email) &&
    !skipStatuts.has(l.statut) &&
    l.secteur === SECTEUR_ARG
  );

  console.log(`\n📊 ${eligible.length} leads éligibles [${SECTEUR_ARG}] sur ${leads.length} total`);

  // Limite journalière
  const today = new Date().toISOString().split('T')[0];
  const sentToday = log.sentEmails.filter(e =>
    e.date && e.date.startsWith(today) &&
    e.secteur === SECTEUR_ARG &&
    e.status === 'sent'
  ).length;
  const remaining = DAILY_LIMIT - sentToday;

  if (remaining <= 0) {
    console.log(`\n⏸️  Limite journalière atteinte pour [${SECTEUR_ARG}] (${DAILY_LIMIT}/jour). Relance demain.`);
    return;
  }

  const batch = eligible.slice(0, remaining);
  console.log(`🚀 Envoi de ${batch.length} emails [${SECTEUR_ARG}] (${sentToday} déjà envoyés aujourd'hui)\n`);

  let success = 0, errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const lead = batch[i];
    console.log(`[${i + 1}/${batch.length}] ${lead.nom} — ${lead.email}`);

    try {
      // 1. Audit
      console.log(`  🔍 Audit en cours...`);
      const audit = await auditLead(lead);
      if (!audit) {
        console.log(`  ⏭️  Audit null — lead ignoré`);
        log.sentEmails.push({
          email: lead.email,
          nom: lead.nom,
          secteur: lead.secteur,
          emailType: null,
          date: new Date().toISOString(),
          status: 'error',
          error: 'audit null',
        });
        saveJSON(LOG_FILE, log);
        errors++;
        continue;
      }
      console.log(`  ✅ Audit OK — emailType: ${audit.emailType} | GMB: ${audit.gmb.status} | Site: ${audit.site.status} | Réseaux: ${audit.reseaux.status}`);

      // 2. Générer HTML
      console.log(`  ✍️  Génération email type ${audit.emailType}...`);
      let html = await generateEmail(lead, audit);
      if (!html) throw new Error('Génération email échouée');

      // 2b. Injecter image hero base64
      const heroB64 = await getHeroBase64(lead.secteur);
      html = injectHeroImage(html, heroB64);

      // 3. Envoyer
      const subject = getEmailSubject(lead, audit);
      await transporter.sendMail({
        from: '"TheCopyCraft" <contact@thecopycraft.fr>',
        to: lead.email,
        subject,
        html,
        text: `Bonjour,\n\nNous avons analysé la présence en ligne de ${lead.nom}.\n\nTheCopyCraft\ncontact@thecopycraft.fr`,
      });

      // 4. Update lead
      const allLeads = loadJSON(LEADS_FILE, []);
      const idx = allLeads.findIndex(l => l.email === lead.email);
      if (idx !== -1) {
        allLeads[idx].statut = 'j0_envoyé';
        allLeads[idx].date_contact = today;
        saveJSON(LEADS_FILE, allLeads);
      }

      // 5. Log
      log.sentEmails.push({
        email: lead.email,
        nom: lead.nom,
        secteur: lead.secteur,
        emailType: audit.emailType,
        date: new Date().toISOString(),
        status: 'sent',
      });
      saveJSON(LOG_FILE, log);

      console.log(`  ✅ Envoyé (type ${audit.emailType}) — objet: "${subject}"`);
      success++;

      // 6. Pause (sauf dernier)
      if (i < batch.length - 1) {
        console.log(`  ⏳ Pause ${DELAY_MS / 60000} min...\n`);
        await sleep(DELAY_MS);
      }

    } catch (err) {
      console.log(`  ❌ Erreur : ${err.message}`);
      log.sentEmails.push({
        email: lead.email,
        nom: lead.nom,
        secteur: lead.secteur,
        emailType: null,
        date: new Date().toISOString(),
        status: 'error',
        error: err.message,
      });
      saveJSON(LOG_FILE, log);
      errors++;
    }
  }

  console.log(`\n✅ Terminé — ${success} envoyés, ${errors} erreurs`);
  console.log(`📈 Total campagne : ${log.sentEmails.filter(e => e.status === 'sent').length} emails envoyés`);
}

main().catch(console.error);
