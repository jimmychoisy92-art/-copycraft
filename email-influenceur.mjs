// email-influenceur.mjs — Prospection email micro-influenceurs Instagram
// Usage: node email-influenceur.mjs
// Lit influenceurs.json, envoie 10 emails max/jour, met à jour les statuts

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INFLUENCEURS_FILE = path.join(__dirname, 'influenceurs.json');
const LIMITE_JOUR = 10;

// ─── SMTP ─────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@thecopycraft.fr',
    pass: process.env.SMTP_PASS,
  },
});

// ─── TEMPLATE HTML ────────────────────────────────────────────────────────────
function buildHtml(influenceur) {
  const { handle, nom, secteur, tarif_estime } = influenceur;
  const secteurLabel = secteur.replace(/_/g, ' ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Instagram</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#1a1a1a;padding:32px 40px;border-radius:8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">The</span>
                    <span style="font-size:22px;font-weight:700;color:#e8944a;letter-spacing:1px;">CopyCraft</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#888888;">Agence de prospection digitale</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CORPS -->
          <tr>
            <td style="background:#ffffff;padding:40px;">

              <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.6;">
                Bonjour,
              </p>

              <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.6;">
                Je me permets de vous contacter au sujet du compte <strong>${handle}</strong>.
              </p>

              <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.6;">
                TheCopyCraft accompagne des commerces locaux parisiens dans le secteur
                <strong>${secteurLabel}</strong> — audit de leur présence digitale, refonte de
                leurs outils de communication, campagnes de prospection. Nous cherchons
                actuellement des micro-influenceurs Instagram pour des collaborations ponctuelles
                dans ce secteur.
              </p>

              <!-- ENCART OFFRE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background:#fff8f2;border-left:4px solid #e8944a;padding:20px 24px;border-radius:0 4px 4px 0;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;">Ce que nous proposons</p>
                    <ul style="margin:0;padding-left:20px;font-size:14px;color:#444444;line-height:1.8;">
                      <li>Produit ou prestation offert par le commerce partenaire (valeur : ${tarif_estime === 'gratuit/produit' ? 'selon commerce' : tarif_estime})</li>
                      <li>Commission de <strong>10 %</strong> sur chaque commerce signé via votre code de parrainage</li>
                      <li>Liberté éditoriale totale — aucun script imposé</li>
                      <li>Collaboration ponctuelle, sans engagement long terme</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:15px;color:#333333;line-height:1.6;">
                Le format est simple : vous publiez un post ou une story sur le commerce partenaire,
                avec votre code personnalisé. À chaque contrat signé via ce code, vous touchez
                10 % de nos honoraires. Pas de contrainte de calendrier particulière.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#333333;line-height:1.6;">
                Si cela vous intéresse, répondez directement à cet email — je vous enverrai le
                détail des partenaires disponibles dans votre secteur et les modalités exactes.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#e8944a;border-radius:4px;">
                    <a href="mailto:contact@thecopycraft.fr?subject=Collaboration ${encodeURIComponent(handle)} × TheCopyCraft"
                       style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                      Répondre à cette proposition
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a1a;padding:20px 40px;border-radius:0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#666666;line-height:1.6;">
                      TheCopyCraft — contact@thecopycraft.fr<br>
                      Pour ne plus recevoir nos emails, répondez avec la mention "désinscription".
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(INFLUENCEURS_FILE)) {
    console.error(`Fichier introuvable : ${INFLUENCEURS_FILE}`);
    console.error('Lancez d\'abord : node scraper-influenceurs.mjs');
    process.exit(1);
  }

  const influenceurs = JSON.parse(fs.readFileSync(INFLUENCEURS_FILE, 'utf8'));
  const aContacter = influenceurs.filter(i => i.statut === 'à_contacter');

  if (aContacter.length === 0) {
    console.log('Aucun influenceur à contacter. Tous ont déjà été traités.');
    process.exit(0);
  }

  const batch = aContacter.slice(0, LIMITE_JOUR);
  console.log(`\n=== EMAIL INFLUENCEURS — TheCopyCraft ===`);
  console.log(`A contacter : ${aContacter.length} | Batch aujourd'hui : ${batch.length}\n`);

  let envoyes = 0;
  let erreurs = 0;

  for (const inf of batch) {
    const sujet = `Collaboration Instagram — ${inf.handle} × TheCopyCraft`;
    const html = buildHtml(inf);

    try {
      await transporter.sendMail({
        from: '"TheCopyCraft" <contact@thecopycraft.fr>',
        to: inf.email_contact,
        subject: sujet,
        html,
      });

      inf.statut = 'contacté';
      inf.date_contact = new Date().toISOString().split('T')[0];
      envoyes++;
      console.log(`  [OK] ${inf.handle.padEnd(22)} → ${inf.email_contact}`);
    } catch (err) {
      erreurs++;
      console.error(`  [ERREUR] ${inf.handle} → ${err.message}`);
    }

    // Pause courte entre envois
    await new Promise(r => setTimeout(r, 800));
  }

  // ─── SAUVEGARDE ─────────────────────────────────────────────────────────────
  fs.writeFileSync(INFLUENCEURS_FILE, JSON.stringify(influenceurs, null, 2), 'utf8');

  console.log(`\nBilan : ${envoyes} envoye(s), ${erreurs} erreur(s)`);
  console.log(`Reste a contacter : ${aContacter.length - envoyes}\n`);
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
