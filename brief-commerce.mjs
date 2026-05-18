// brief-commerce.mjs — Génère un brief influenceur + code promo unique pour un commerce signé
// Usage: node brief-commerce.mjs <email_lead>
// Ex:    node brief-commerce.mjs contact@lepetitzinc.fr

import fs from 'fs';
import nodemailer from 'nodemailer';

const LEADS_FILE = './leads-all.json';
const BRIEFS_FILE = './briefs.json';

function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateCode(nom) {
  // Ex: "Le Petit Zinc" → "ZINC10"
  const words = nom.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(' ').filter(Boolean);
  const base = words[words.length - 1].substring(0, 5);
  return `${base}10`;
}

const SMTP = {
  host: 'ssl0.ovh.net', port: 465, secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
};

const OBJECTIFS_SECTEUR = {
  restaurant:           'réservations en ligne',
  estheticienne:        'prises de rendez-vous',
  salon_coiffure:       'réservations coiffure',
  spa:                  'réservations soins',
  clinique_esthetique:  'consultations esthétiques',
  architecte_interieur: 'demandes de devis',
};

const CONTENU_SECTEUR = {
  restaurant:           ['Visite et dégustation filmée', 'Story "soirée parfaite" avec menu', 'Reel table dressée + ambiance'],
  estheticienne:        ['Soin filmé de A à Z (accord client)', 'Avant/Après peau (accord client)', 'Story "routine beauté" avec les produits'],
  salon_coiffure:       ['Transformation coiffure filmée', 'Story "couleur du moment"', 'Reel coupe tendance saison'],
  spa:                  ['Visite des cabines en story', 'Session relaxation filmée', 'Reel "moment de détente"'],
  clinique_esthetique:  ['Visite des locaux + présentation praticienne', 'Témoignage post-soin', 'Story "soin du mois"'],
  architecte_interieur: ['Visite chantier en cours', 'Before/After réalisation', 'Story "coup de cœur déco"'],
};

async function main() {
  const emailLead = process.argv[2];
  if (!emailLead) {
    console.error('Usage: node brief-commerce.mjs <email_lead>');
    process.exit(1);
  }

  const leads = loadJSON(LEADS_FILE, []);
  const lead = leads.find(l => l.email?.toLowerCase() === emailLead.toLowerCase());

  if (!lead) {
    console.error(`❌ Lead non trouvé : ${emailLead}`);
    process.exit(1);
  }

  const briefs = loadJSON(BRIEFS_FILE, []);
  const existingBrief = briefs.find(b => b.email === emailLead);
  if (existingBrief) {
    console.log(`⚠️  Brief déjà généré pour ${lead.nom} — code promo : ${existingBrief.code_promo}`);
    console.log(JSON.stringify(existingBrief, null, 2));
    return;
  }

  const codePromo = generateCode(lead.nom);
  const objectif = OBJECTIFS_SECTEUR[lead.secteur] || 'nouveaux clients';
  const contenu = CONTENU_SECTEUR[lead.secteur] || ['Post de présentation', 'Story visite', 'Reel ambiance'];

  const brief = {
    nom: lead.nom,
    email: lead.email,
    secteur: lead.secteur,
    ville: lead.ville || 'Paris',
    code_promo: codePromo,
    remise_code: '10%',
    commission_influenceur: '10% par réservation tracée',
    objectif,
    nb_influenceurs: 4,
    duree_campagne: '30 jours',
    contenu_attendu: contenu,
    date_creation: new Date().toISOString().split('T')[0],
    statut: 'brief_genere',
  };

  briefs.push(brief);
  saveJSON(BRIEFS_FILE, briefs);

  // Mettre à jour le statut du lead
  lead.statut = 'vendu';
  lead.code_promo = codePromo;
  saveJSON(LEADS_FILE, leads);

  console.log(`\n✅ Brief généré pour ${lead.nom}`);
  console.log(`   Code promo : ${codePromo} (${brief.remise_code})`);
  console.log(`   Objectif   : ${objectif}`);
  console.log(`   Contenu    : ${contenu.join(' · ')}\n`);

  // Envoyer le brief par email au commerce
  const transporter = nodemailer.createTransport(SMTP);
  await transporter.sendMail({
    from: '"TheCopyCraft" <contact@thecopycraft.fr>',
    to: lead.email,
    subject: `Votre campagne influenceurs est prête — ${lead.nom}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:26px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:11px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Campagne Influenceurs</div>
  </td></tr>

  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 16px;font-size:21px;font-weight:900;color:#1a1a1a;">Votre campagne est lancée.</p>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">Nous avons sélectionné 4 micro-influenceurs locaux pour promouvoir ${lead.nom} sur Instagram. Voici le brief de votre campagne.</p>
  </td></tr>

  <tr><td style="padding:0 28px 20px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Votre code promo exclusif</p>
      <p style="margin:0;font-size:36px;font-weight:900;color:#fff;letter-spacing:4px;">${codePromo}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#999;">Les influenceurs communiqueront ce code à leur audience — chaque utilisation est tracée et vous rapporte directement des ${objectif}.</p>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 20px;">
    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Contenu prévu</p>
    ${contenu.map(c => `<div style="border-left:3px solid #e8944a;padding:10px 16px;margin-bottom:8px;background:#f9f5f0;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:14px;color:#444;">${c}</p>
    </div>`).join('')}
  </td></tr>

  <tr><td style="padding:0 28px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;text-align:center;padding:16px;background:#f9fafb;border-radius:8px;">
          <div style="font-size:24px;font-weight:900;color:#1a1a1a;">4</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">influenceurs</div>
        </td>
        <td style="width:4%;"></td>
        <td style="width:33%;text-align:center;padding:16px;background:#f9fafb;border-radius:8px;">
          <div style="font-size:24px;font-weight:900;color:#1a1a1a;">30j</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">de campagne</div>
        </td>
        <td style="width:4%;"></td>
        <td style="width:33%;text-align:center;padding:16px;background:#f9fafb;border-radius:8px;">
          <div style="font-size:24px;font-weight:900;color:#e8944a;">10%</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">de remise clients</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 28px 36px;">
    <p style="margin:0 0 12px;font-size:14px;color:#444;">Pour toute question sur votre campagne, répondez directement à cet email.</p>
    <p style="margin:0;font-size:13px;color:#888;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`,
  });

  console.log(`📧 Brief envoyé à ${lead.email}`);
}

main().catch(console.error);
