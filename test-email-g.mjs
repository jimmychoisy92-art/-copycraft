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
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
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
const audit = { gmb: { rating: 4.7, reviewCount: 312 } };
const gmb = `${audit.gmb.rating}/5 (${audit.gmb.reviewCount} avis)`;
const ville = lead.ville;

const postData = {
  postUrl:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&q=85',
  avatarUrl:  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80',
  handle: 'lea_gourmet', location: 'Paris 11ème', likes: '1 243', reservations: 31,
  caption: 'Soirée parfaite chez <strong>@lecomptoirdumarais</strong> 🍷 Cuisine généreuse, ambiance chaleureuse — exactement ce qu\'on cherchait. Réservez avec le code <strong>LEA10</strong> pour -10% sur l\'addition. On y retourne très vite.',
  hashtags: '#restaurant #paris #foodie #bonneadresse #diner',
  comments: [
    { user: 'mathilde_b',    text: 'on y était vendredi, c\'est vraiment excellent 😍' },
    { user: 'pierre.paris',  text: 'j\'ai réservé avec le code, merci pour le tips !' },
    { user: 'famille_morin', text: 'parfait pour notre anniversaire de mariage 🥂' },
  ],
};

const infProfiles = [
  { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=82', file: 'inf_t1.jpg', handle: '@paris_foodie', abonnes: '31,6k' },
  { url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=82', file: 'inf_t2.jpg', handle: '@lea_gourmet',  abonnes: '17,9k' },
  { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=82', file: 'inf_t3.jpg', handle: '@thomas_eats',  abonnes: '11,4k' },
];

console.log('🖼️  Téléchargement images...');
const [postB64, avatarB64] = await Promise.all([dl(postData.postUrl, 'tpost.jpg'), dl(postData.avatarUrl, 'tavatar.jpg')]);
const infB64s = await Promise.all(infProfiles.map(i => dl(i.url, i.file)));
console.log(`  Post: ${postB64?'OK':'KO'} | Avatar: ${avatarB64?'OK':'KO'} | Profils: ${infB64s.filter(Boolean).length}/3`);

const postImg   = postB64   ? `<img src="${postB64}"   style="width:100%;display:block;border:0;" />` : `<div style="height:260px;background:#222;"></div>`;
const avatarImg = avatarB64 ? `<img src="${avatarB64}" style="width:38px;height:38px;border-radius:50%;display:block;object-fit:cover;border:0;" />` : `<div style="width:38px;height:38px;border-radius:50%;background:#555;"></div>`;

const commentsHtml = postData.comments.map(c => `
  <tr><td style="padding:3px 0;">
    <span style="font-size:12px;font-weight:700;color:#1a1a1a;">${c.user}</span>
    <span style="font-size:12px;color:#555;"> ${c.text}</span>
  </td></tr>`).join('');

const infBlocks = infProfiles.map((inf, i) => {
  const img = infB64s[i] ? `<img src="${infB64s[i]}" style="width:100%;height:160px;object-fit:cover;display:block;border:0;" />` : `<div style="height:160px;background:#333;"></div>`;
  return `<td style="width:32%;padding:0 4px;vertical-align:top;">
    <div style="border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15);">
      ${img}
      <div style="background:#1a1a1a;padding:8px 10px;">
        <div style="font-size:12px;font-weight:700;color:#fff;">${inf.handle}</div>
        <div style="font-size:11px;color:#e8944a;margin-top:2px;">${inf.abonnes} abonnés locaux</div>
      </div>
    </div>
  </td>`;
}).join('');

const html = `<!DOCTYPE html>
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
    <p style="margin:0 0 12px;font-size:20px;font-weight:900;color:#1a1a1a;line-height:1.3;">
      ${gmb} sur Google, réseaux actifs.<br>Voici ce que des micro-influenceurs locaux font pour vos concurrents.
    </p>
    <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
      Ce post a été publié il y a 6 jours. Il a généré <strong>${postData.reservations} nouvelles réservations</strong> pour l'établissement concerné.
    </p>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <div style="border:1px solid #dbdbdb;border-radius:10px;overflow:hidden;background:#fff;">
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
      ${postImg}
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 14px 4px;">
        <tr>
          <td><span style="font-size:22px;">♥</span><span style="font-size:22px;margin-left:10px;">💬</span><span style="font-size:22px;margin-left:10px;">↗</span></td>
          <td style="text-align:right;font-size:20px;">🔖</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:2px 14px 6px;">
        <tr><td><span style="font-size:13px;font-weight:700;color:#1a1a1a;">${postData.likes} J'aime</span></td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 14px 8px;">
        <tr><td>
          <span style="font-size:13px;font-weight:700;">@${postData.handle} </span>
          <span style="font-size:13px;color:#1a1a1a;">${postData.caption}</span>
          <div style="margin-top:4px;font-size:13px;color:#0095f6;">${postData.hashtags}</div>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:6px 14px 12px;background:#fafafa;border-top:1px solid #efefef;">
        ${commentsHtml}
        <tr><td style="padding-top:4px;"><span style="font-size:11px;color:#aaa;">il y a 6 jours</span></td></tr>
      </table>
    </div>
    <div style="margin-top:12px;background:#f9f9f9;border-left:3px solid #e8944a;padding:12px 16px;border-radius:0 6px 6px 0;">
      <p style="margin:0;font-size:13px;color:#555;">Ce post a généré <strong style="color:#1a1a1a;">${postData.reservations} réservations</strong> en 7 jours — sans aucune publicité payante.</p>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;">5,2×</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">ROI moyen<br>micro-influenceurs</div>
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;">7×</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">plus d'engagement<br>vs publicité Meta</div>
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:32%;text-align:center;vertical-align:top;">
        <div style="background:#1a1a1a;border-radius:8px;padding:16px 8px;">
          <div style="font-size:28px;font-weight:900;color:#e8944a;">63%</div>
          <div style="font-size:10px;color:#fff;margin-top:5px;line-height:1.4;">font confiance aux<br>recommandations</div>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Profils disponibles dans votre secteur à ${ville}</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${infBlocks}</tr></table>
    <p style="margin:10px 0 0;font-size:11px;color:#aaa;text-align:center;font-style:italic;">Audience locale vérifiée — taux d'engagement moyen 4,8%</p>
  </td></tr>

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

  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#e8944a;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Campagne clé en main</div>
      <div style="font-size:48px;font-weight:900;color:#1a1a1a;line-height:1;">349€</div>
      <div style="font-size:13px;color:#888;margin-top:6px;">Sans abonnement · Livré en 7 jours · 4 influenceurs locaux</div>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="https://copycraft-landing.vercel.app"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 36px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux être recontacté →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

console.log('📧 Envoi...');
await transporter.sendMail({
  from: '"TheCopyCraft" <contact@thecopycraft.fr>',
  to: 'contact@thecopycraft.fr',
  subject: `[TEST v3] Le Petit Zinc — voici ce que des influenceurs locaux font pour vos concurrents`,
  html,
});
console.log('✅ Email G v3 envoyé !');
