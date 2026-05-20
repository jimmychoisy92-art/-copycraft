import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net', port: 465, secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: process.env.SMTP_PASS }
});

const DEMO_URL = 'https://jimmychoisy92-art.github.io/-copycraft/demos/dulcenae.html';

const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="background:#1a1a1a;padding:32px 40px;border-radius:8px 8px 0 0;">
    <table width="100%"><tr>
      <td><span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">The</span><span style="font-size:22px;font-weight:700;color:#e8944a;letter-spacing:1px;">CopyCraft</span></td>
      <td align="right"><span style="font-size:12px;color:#888;">Agence de prospection digitale</span></td>
    </tr></table>
  </td></tr>

  <tr><td style="background:#fff;padding:40px;">
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">Bonjour,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Nous avons analysé la présence digitale de <strong>Maison de Beauté Dulcenae</strong> et avons remarqué une opportunité importante.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Votre établissement a une note Google de <strong>4.9/5</strong> — c'est exceptionnel. Pourtant, votre site actuel ne reflète pas cette qualité et ne vous ramène probablement pas de nouveaux clients chaque semaine.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td style="background:#fff8f2;border-left:4px solid #e8944a;padding:24px 28px;border-radius:0 4px 4px 0;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.5px;">Nous avons créé un site vitrine pour Dulcenae</p>
        <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.7;">
          En 24h, nous avons conçu un site moderne, optimisé Google, avec réservation en ligne. Voici ce que vos futures clientes verront :
        </p>
        <a href="${DEMO_URL}" style="display:inline-block;padding:14px 32px;background:#e8944a;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:2px;">
          Voir le site vitrine →
        </a>
      </td></tr>
    </table>

    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Ce site est prêt à être mis en ligne. Il comprend vos soins, vos tarifs, vos avis Google et un système de réservation en ligne.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f9f9f9;padding:20px;border-radius:4px;">
      <tr><td>
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a1a1a;">Ce qui est inclus :</p>
        <p style="margin:3px 0;font-size:13px;color:#444;">✅ Site vitrine sur mesure (mobile + desktop)</p>
        <p style="margin:3px 0;font-size:13px;color:#444;">✅ Référencement Google (fiche GMB optimisée)</p>
        <p style="margin:3px 0;font-size:13px;color:#444;">✅ Réservation en ligne intégrée</p>
        <p style="margin:3px 0;font-size:13px;color:#444;">✅ Mise en ligne en 48h</p>
        <p style="margin:3px 0;font-size:13px;color:#444;">✅ 1 mois de suivi offert</p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
      Vous souhaitez en savoir plus ? Réservez un appel de 20 minutes, sans engagement :
    </p>

    <a href="https://calendly.com/agenda-pro/rdv-tel-copy-craft" style="display:inline-block;padding:16px 36px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
      Réserver un créneau gratuit
    </a>
  </td></tr>

  <tr><td style="background:#f8f8f8;padding:20px 40px;border-radius:0 0 8px 8px;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#999;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

const result = await transporter.sendMail({
  from: 'TheCopyCraft <contact@thecopycraft.fr>',
  to: 'jimmychoisy92@gmail.com',
  subject: 'Maison de Beauté Dulcenae — voici à quoi pourrait ressembler votre site',
  html
});

console.log('✅ Email test envoyé à jimmychoisy92@gmail.com —', result.messageId);
