import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);
const IMG_DIR = path.join(__dirname, 'tmp_emails');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net', port: 465, secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: process.env.SMTP_PASS },
});

async function dl(url, file) {
  const dest = path.join(IMG_DIR, file);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 3000) {
    try { await execAsync(`curl -sL --max-time 15 -A "Mozilla/5.0" -o "${dest}" "${url}"`); } catch(e) {}
  }
  return (fs.existsSync(dest) && fs.statSync(dest).size > 3000)
    ? `data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}` : null;
}

const lead = { nom: 'Le Petit Zinc', secteur: 'restaurant', ville: 'Paris' };

// Vendredi prochain
const today = new Date();
const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
const friday = new Date(today);
friday.setDate(today.getDate() + daysUntilFriday);
const vendredi = friday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// Image graphique "manque à gagner"
const chartUrl = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=480&q=85';
const chartB64 = await dl(chartUrl, 'chart_loss.jpg');
console.log(`Chart: ${chartB64 ? 'OK' : 'KO'}`);

const chartImg = chartB64
  ? `<img src="${chartB64}" alt="manque à gagner" style="width:100%;display:block;border:0;filter:grayscale(20%);" />`
  : '';

const html = `<!DOCTYPE html>
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

  <!-- CORPS -->
  <tr><td style="padding:36px 28px 12px;">
    <p style="margin:0 0 24px;font-size:18px;font-weight:900;color:#1a1a1a;">C'est mon dernier message.</p>

    <!-- Chiffre de perte -->
    <div style="background:#f9f9f9;border-left:4px solid #c0392b;border-radius:0 8px 8px 0;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:1px;">Ce que représente chaque mois d'inaction</p>
      <p style="margin:0;font-size:15px;color:#333;line-height:1.7;">
        Une campagne de 4 micro-influenceurs locaux génère en moyenne <strong>23 réservations supplémentaires par mois</strong> pour un restaurant parisien.<br><br>
        À <strong>35€ de panier moyen</strong>, c'est <strong style="font-size:17px;color:#1a1a1a;">805€ de chiffre d'affaires manqué</strong> chaque mois que la campagne n'est pas lancée.<br><br>
        Sur 3 mois : <strong style="color:#c0392b;">2 415€ laissés à vos concurrents.</strong>
      </p>
    </div>

    ${chartImg ? `<div style="border-radius:8px;overflow:hidden;margin-bottom:24px;">${chartImg}</div>` : ''}

    <p style="margin:0 0 6px;font-size:15px;color:#444;line-height:1.7;">
      La campagne est prête. <strong>349€ · 4 influenceurs locaux · livré en 7 jours.</strong>
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#888;">Si le moment n'est pas opportun, je comprends tout à fait.</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="https://copycraft-landing.vercel.app"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Répondre à ce message →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

console.log('📧 Envoi...');
await transporter.sendMail({
  from: '"TheCopyCraft" <contact@thecopycraft.fr>',
  to: 'contact@thecopycraft.fr',
  subject: `Dernier message — Le Petit Zinc`,
  html,
});
console.log('✅ Relance J+7 envoyée !');
