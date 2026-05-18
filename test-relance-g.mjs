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
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
});

// Photo influenceur pour le faux post Instagram
const POST_IMG = { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=85', file: 'post_resto.jpg' };
const AVATAR_IMG = { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80', file: 'avatar_inf.jpg' };

async function downloadImg(url, file) {
  const dest = path.join(IMG_DIR, file);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < 3000) {
    try { await execAsync(`curl -sL --max-time 15 -A "Mozilla/5.0" -o "${dest}" "${url}"`); } catch(e) {}
  }
  return (fs.existsSync(dest) && fs.statSync(dest).size > 3000)
    ? `data:image/jpeg;base64,${fs.readFileSync(dest).toString('base64')}`
    : null;
}

console.log('🖼️  Téléchargement images...');
const [postB64, avatarB64] = await Promise.all([
  downloadImg(POST_IMG.url, POST_IMG.file),
  downloadImg(AVATAR_IMG.url, AVATAR_IMG.file),
]);
console.log(`  Post: ${postB64 ? 'OK' : 'KO'} | Avatar: ${avatarB64 ? 'OK' : 'KO'}`);

const postImg = postB64
  ? `<img src="${postB64}" alt="post instagram" style="width:100%;display:block;border:0;" />`
  : `<div style="height:240px;background:#222;"></div>`;

const avatarImg = avatarB64
  ? `<img src="${avatarB64}" alt="avatar" style="width:36px;height:36px;border-radius:50%;display:block;border:0;object-fit:cover;" />`
  : `<div style="width:36px;height:36px;border-radius:50%;background:#555;"></div>`;

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

  <!-- ACCROCHE -->
  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 10px;font-size:14px;color:#888;">Suite à mon message de mardi,</p>
    <p style="margin:0;font-size:19px;font-weight:900;color:#1a1a1a;line-height:1.3;">
      Un restaurant de votre secteur à Paris vient de lancer sa campagne influenceurs.<br>
      <span style="color:#e8944a;">Voici ce que ça donne.</span>
    </p>
  </td></tr>

  <!-- FAUX POST INSTAGRAM -->
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:#555;">Ce post a été publié il y a 4 jours par un micro-influenceur local :</p>

    <!-- Carte style Instagram -->
    <div style="border:1px solid #dbdbdb;border-radius:10px;overflow:hidden;max-width:400px;margin:0 auto;">

      <!-- Header post -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:10px 14px;">
        <tr>
          <td style="width:40px;vertical-align:middle;">${avatarImg}</td>
          <td style="padding-left:10px;vertical-align:middle;">
            <div style="font-size:13px;font-weight:700;color:#1a1a1a;">@paris_foodie</div>
            <div style="font-size:11px;color:#888;">Paris 11ème · Partenariat</div>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:inline-block;"></div>
          </td>
        </tr>
      </table>

      <!-- Image post -->
      ${postImg}

      <!-- Actions -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:10px 14px 4px;">
        <tr>
          <td>
            <span style="font-size:20px;">♥</span>
            <span style="font-size:20px;margin-left:8px;">💬</span>
            <span style="font-size:20px;margin-left:8px;">↗</span>
          </td>
        </tr>
      </table>

      <!-- Likes -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:4px 14px;">
        <tr><td>
          <span style="font-size:13px;font-weight:700;color:#1a1a1a;">847 J'aime</span>
        </td></tr>
      </table>

      <!-- Légende -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:4px 14px 12px;">
        <tr><td>
          <span style="font-size:13px;font-weight:700;color:#1a1a1a;">paris_foodie</span>
          <span style="font-size:13px;color:#1a1a1a;"> Soirée incroyable chez </span>
          <span style="font-size:13px;font-weight:700;color:#0095f6;">@lecomptoirdumarais</span>
          <span style="font-size:13px;color:#1a1a1a;"> — cuisine authentique, ambiance parfaite. Réservez avec le code </span>
          <span style="font-size:13px;font-weight:700;color:#1a1a1a;">SOFIA10</span>
          <span style="font-size:13px;color:#1a1a1a;"> pour -10% 🍷</span>
          <div style="margin-top:4px;font-size:13px;color:#0095f6;">#restaurant #paris #foodie #bonneadresse</div>
        </td></tr>
      </table>

      <!-- Commentaires -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:8px 14px;border-top:1px solid #efefef;">
        <tr><td style="padding-bottom:4px;">
          <span style="font-size:12px;font-weight:700;color:#1a1a1a;">mathilde_r</span>
          <span style="font-size:12px;color:#555;"> on y retourne ce week-end ! 😍</span>
        </td></tr>
        <tr><td style="padding-bottom:4px;">
          <span style="font-size:12px;font-weight:700;color:#1a1a1a;">julien.paris</span>
          <span style="font-size:12px;color:#555;"> j'ai réservé avec le code, merci !</span>
        </td></tr>
        <tr><td>
          <span style="font-size:12px;font-weight:700;color:#1a1a1a;">famille_dupont</span>
          <span style="font-size:12px;color:#555;"> on cherchait un endroit comme ça 🙌</span>
        </td></tr>
      </table>

    </div>

    <!-- Stat sous le post -->
    <div style="margin-top:14px;background:#f9f9f9;border-left:3px solid #e8944a;padding:12px 16px;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#555;">Ce type de post génère en moyenne <strong style="color:#1a1a1a;">23 réservations supplémentaires</strong> sur 7 jours pour un restaurant parisien. Avec 4 influenceurs, c'est 4 posts de ce type publiés ce mois-ci.</p>
    </div>
  </td></tr>

  <!-- MESSAGE -->
  <tr><td style="padding:0 28px 28px;">
    <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;">
      La campagne pour <strong>Le Petit Zinc</strong> est prête. Il suffit de répondre à cet email pour démarrer.
    </p>
    <p style="margin:0;font-size:13px;color:#888;">349€ · 4 influenceurs locaux · livré en 7 jours</p>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="https://copycraft-landing.vercel.app"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux lancer ma campagne →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

console.log('📧 Envoi à contact@thecopycraft.fr...');
await transporter.sendMail({
  from: '"TheCopyCraft" <contact@thecopycraft.fr>',
  to: 'contact@thecopycraft.fr',
  subject: `[TEST RELANCE J+3] Le Petit Zinc — un concurrent vient de lancer sa campagne`,
  html,
});
console.log('✅ Relance J+3 Email G envoyée !');
