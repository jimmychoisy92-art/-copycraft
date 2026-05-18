import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@thecopycraft.fr',
    pass: 'pompiers94Creteil.',
  },
});

const FROM = '"TheCopyCraft" <contact@thecopycraft.fr>';
const TO = 'contact@thecopycraft.fr';

// ─────────────────────────────────────────────
// EMAIL 1 — Sans fiche Google My Business
// ─────────────────────────────────────────────
const email1 = {
  from: FROM,
  to: TO,
  subject: 'Salon Lumière — vous êtes invisible sur Google Maps',
  html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Salon Lumière</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

  <!-- HEADER -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#ffffff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <!-- IMAGE HERO -->
  <tr><td style="position:relative;padding:0;margin:0;">
    <div style="position:relative;overflow:hidden;">
      <img src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80" alt="Salon de coiffure" width="600" style="width:100%;display:block;max-width:600px;" />
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.78));padding:28px 28px 22px;text-align:center;">
        <p style="margin:0;color:#ffffff;font-size:19px;font-weight:700;line-height:1.4;">Chaque jour, des clients vous cherchent<br>et ne vous trouvent pas</p>
      </div>
    </div>
  </td></tr>

  <!-- BLOC URGENCE ROUGE -->
  <tr><td style="background:#c0392b;padding:20px 28px;">
    <p style="margin:0;color:#ffffff;font-size:15px;line-height:1.7;text-align:center;">
      <strong>En ce moment, des centaines de personnes cherchent "salon coiffure Paris 15" sur Google.<br>
      Sans fiche Google My Business, vous n'existez pas pour eux.</strong>
    </p>
  </td></tr>

  <!-- TABLEAU AVEC / SANS -->
  <tr><td style="padding:32px 28px 10px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;letter-spacing:1px;text-transform:uppercase;">La réalité pour votre salon</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;">
      <tr style="background:#1a1a1a;">
        <td style="padding:12px 16px;color:#ffffff;font-size:13px;font-weight:700;width:44%;">Critère</td>
        <td style="padding:12px 16px;color:#4ade80;font-size:13px;font-weight:700;text-align:center;width:28%;">✅ AVEC fiche</td>
        <td style="padding:12px 16px;color:#f87171;font-size:13px;font-weight:700;text-align:center;width:28%;">❌ SANS fiche</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:12px 16px;font-size:14px;color:#333;border-bottom:1px solid #eee;">Visibilité Google Maps</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Première page</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#dc2626;font-weight:700;border-bottom:1px solid #eee;">Invisible</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:12px 16px;font-size:14px;color:#333;border-bottom:1px solid #eee;">Avis clients visibles</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Oui</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#dc2626;font-weight:700;border-bottom:1px solid #eee;">Non</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:12px 16px;font-size:14px;color:#333;border-bottom:1px solid #eee;">Horaires affichés</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Oui</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#dc2626;font-weight:700;border-bottom:1px solid #eee;">Non</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:12px 16px;font-size:14px;color:#333;border-bottom:1px solid #eee;">Appel direct depuis Google</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Oui</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#dc2626;font-weight:700;border-bottom:1px solid #eee;">Non</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:12px 16px;font-size:14px;color:#333;">Confiance client</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#16a34a;font-weight:700;">+67%</td>
        <td style="padding:12px 16px;text-align:center;font-size:14px;color:#dc2626;font-weight:700;">—</td>
      </tr>
    </table>
  </td></tr>

  <!-- CHIFFRES CLÉS -->
  <tr><td style="padding:28px 28px 10px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Ce que vous perdez chaque jour</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;padding:0 6px 12px 0;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#e8944a;line-height:1;">46%</div>
            <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">des recherches Google ont une intention locale</div>
          </div>
        </td>
        <td style="width:33%;padding:0 3px 12px;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:#e8944a;line-height:1;">+1 000</div>
            <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">vues/mois en moyenne avec une fiche GMB optimisée</div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 12px 6px;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#e8944a;line-height:1;">76%</div>
            <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">des recherches locales aboutissent à une visite en 24h</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CE QU'ON FAIT -->
  <tr><td style="padding:10px 28px 20px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on fait pour vous</p>
      <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.8;">
        Création complète de votre fiche Google My Business — photos professionnelles, description optimisée, catégories, horaires, zone de service — et configuration pour apparaître dans les premières recherches locales. Livraison en 48h.
      </p>
    </div>
  </td></tr>

  <!-- TARIF -->
  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Offre de lancement</div>
      <div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">150€</div>
      <div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Création + optimisation complète — livraison en 48h</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Fiche%20Google%20My%20Business&body=Bonjour%2C%0A%0AJe%20suis%20int%C3%A9ress%C3%A9%20par%20la%20cr%C3%A9ation%20de%20ma%20fiche%20Google.%0A%0AMon%20%C3%A9tablissement%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#ffffff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux ma fiche Google maintenant →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
};

// ─────────────────────────────────────────────
// EMAIL 2 — Sans site web (Fadiman Coiffure)
// ─────────────────────────────────────────────
const email2 = {
  from: FROM,
  to: TO,
  subject: 'Fadiman Coiffure — 199 avis 5 étoiles, mais pas de site web',
  html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fadiman Coiffure</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

  <!-- HEADER -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#ffffff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <!-- IMAGE HERO -->
  <tr><td style="padding:0;margin:0;">
    <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80" alt="Salon luxe" width="600" style="width:100%;display:block;max-width:600px;" />
  </td></tr>

  <!-- ACCROCHE FORTE -->
  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.3;">Vous avez 199 avis 5 étoiles.<br>C'est exceptionnel.</p>
    <p style="margin:0;font-size:16px;color:#444;line-height:1.7;">Mais sans site web, <strong style="color:#c0392b;">75% de vos clients potentiels passent chez un concurrent qui en a un.</strong> Votre réputation est là. Elle mérite une vitrine à la hauteur.</p>
  </td></tr>

  <!-- CHIFFRES CLÉS -->
  <tr><td style="padding:0 28px 24px;">
    <div style="background:#f9f9f9;border-left:4px solid #e8944a;padding:16px 20px;margin-bottom:12px;border-radius:0 6px 6px 0;">
      <span style="font-size:14px;color:#333;line-height:1.6;"><strong style="color:#1a1a1a;">75%</strong> des consommateurs jugent la crédibilité d'une entreprise sur son site web <em style="color:#888;">(Stanford)</em></span>
    </div>
    <div style="background:#f9f9f9;border-left:4px solid #e8944a;padding:16px 20px;margin-bottom:12px;border-radius:0 6px 6px 0;">
      <span style="font-size:14px;color:#333;line-height:1.6;">Un salon avec site web reçoit <strong style="color:#1a1a1a;">2x plus de demandes</strong> de réservation</span>
    </div>
    <div style="background:#f9f9f9;border-left:4px solid #e8944a;padding:16px 20px;border-radius:0 6px 6px 0;">
      <span style="font-size:14px;color:#333;line-height:1.6;">Vos 199 avis pourraient vous ramener <strong style="color:#1a1a1a;">3x plus de clients</strong> avec un site optimisé</span>
    </div>
  </td></tr>

  <!-- 3 DIRECTIONS -->
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">3 directions possibles pour votre site</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Option A -->
        <td style="width:32%;padding:0 4px 0 0;vertical-align:top;">
          <div style="background:#1a1a1a;border-radius:8px;height:180px;padding:18px 14px;box-sizing:border-box;display:table;width:100%;">
            <div style="display:table-cell;vertical-align:middle;">
              <div style="font-size:11px;color:#e8944a;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Option A</div>
              <div style="font-size:14px;color:#ffffff;font-weight:700;margin-bottom:8px;">Élégant &amp; Minimaliste</div>
              <div style="font-size:12px;color:#aaa;line-height:1.5;">Fond noir, typographie blanche. Pour une image haut de gamme et exclusive.</div>
            </div>
          </div>
        </td>
        <!-- Option B -->
        <td style="width:32%;padding:0 4px;vertical-align:top;">
          <div style="background:#f5f0eb;border:2px solid #c4a882;border-radius:8px;height:180px;padding:18px 14px;box-sizing:border-box;display:table;width:100%;">
            <div style="display:table-cell;vertical-align:middle;">
              <div style="font-size:11px;color:#c4a882;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Option B</div>
              <div style="font-size:14px;color:#5a3e28;font-weight:700;margin-bottom:8px;">Chaleureux &amp; Premium</div>
              <div style="font-size:12px;color:#7a6050;line-height:1.5;">Crème et or. Pour inspirer confiance et un accueil chaleureux dès la première visite.</div>
            </div>
          </div>
        </td>
        <!-- Option C -->
        <td style="width:32%;padding:0 0 0 4px;vertical-align:top;">
          <div style="background:#ffffff;border:2px solid #2d6a4f;border-radius:8px;height:180px;padding:18px 14px;box-sizing:border-box;display:table;width:100%;">
            <div style="display:table-cell;vertical-align:middle;">
              <div style="font-size:11px;color:#2d6a4f;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Option C</div>
              <div style="font-size:14px;color:#1a1a1a;font-weight:700;margin-bottom:8px;">Moderne &amp; Épuré</div>
              <div style="font-size:12px;color:#555;line-height:1.5;">Blanc et vert foncé. Pour un look contemporain qui plaît à toutes les générations.</div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CE QU'ON INCLUT -->
  <tr><td style="padding:0 28px 20px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Tout est inclus</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;vertical-align:top;">
            <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Design sur mesure</p>
            <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Textes copywriting inclus</p>
          </td>
          <td style="width:50%;vertical-align:top;">
            <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Formulaire de réservation</p>
            <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Optimisation mobile complète</p>
          </td>
        </tr>
      </table>
    </div>
  </td></tr>

  <!-- TARIF -->
  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Création site vitrine</div>
      <div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">800€</div>
      <div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Livré en 7 jours, clé en main</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Site%20web%20Fadiman%20Coiffure&body=Bonjour%2C%0A%0AJe%20souhaite%20voir%20les%20maquettes%20pour%20mon%20site.%0A%0AMon%20salon%20%3A%20Fadiman%20Coiffure%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#ffffff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux voir les maquettes →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
};

// ─────────────────────────────────────────────
// EMAIL 3 — Sans réseaux sociaux (Le P'tit Bistrot)
// ─────────────────────────────────────────────
const email3 = {
  from: FROM,
  to: TO,
  subject: "Le P'tit Bistrot — 1419 clients satisfaits, 0 présence Instagram",
  html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Le P'tit Bistrot</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

  <!-- HEADER -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#ffffff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <!-- IMAGE HERO avec overlay -->
  <tr><td style="position:relative;padding:0;margin:0;">
    <div style="position:relative;overflow:hidden;">
      <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80" alt="Restaurant gastronomique" width="600" style="width:100%;display:block;max-width:600px;" />
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.82));padding:30px 28px 24px;text-align:center;">
        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;line-height:1.4;">1419 avis 4,6 étoiles.<br>Mais sur Instagram, vous n'existez pas.</p>
      </div>
    </div>
  </td></tr>

  <!-- ACCROCHE -->
  <tr><td style="padding:28px 28px 20px;">
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">
      1419 personnes ont adoré votre restaurant. Aucune ne peut vous retrouver sur Instagram. Chaque semaine, des clients potentiels cherchent <strong>"restaurant Paris 4"</strong> sur Instagram — et choisissent vos concurrents qui, eux, y sont présents.
    </p>
  </td></tr>

  <!-- MOCK INSTAGRAM -->
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#888;text-align:center;text-transform:uppercase;letter-spacing:1px;">Ce que ça donne en vrai</p>
    <div style="border:1px solid #dbdbdb;border-radius:8px;overflow:hidden;max-width:320px;margin:0 auto;font-family:Arial,sans-serif;">
      <!-- Header post -->
      <div style="padding:10px 12px;display:flex;align-items:center;background:#fff;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:36px;height:36px;">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7);"></div>
          </td>
          <td style="padding-left:10px;">
            <div style="font-size:13px;font-weight:700;color:#1a1a1a;">le_ptit_bistrot_paris</div>
            <div style="font-size:11px;color:#888;">Paris 4ème</div>
          </td>
        </tr></table>
      </div>
      <!-- Image post -->
      <div style="position:relative;">
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&q=80" alt="Plat du restaurant" width="320" style="width:100%;display:block;" />
      </div>
      <!-- Likes/commentaires -->
      <div style="padding:10px 12px;background:#fff;">
        <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">❤️ 847 j'aime</div>
        <div style="font-size:13px;color:#1a1a1a;"><strong>le_ptit_bistrot_paris</strong> Notre tartiflette maison... un plat qui réchauffe les soirées parisiennes 🍷 #restaurant #paris4 #bistrots #foodparis</div>
        <div style="font-size:12px;color:#888;margin-top:6px;">Voir les 94 commentaires</div>
        <div style="font-size:11px;color:#aaa;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">Il y a 2 heures</div>
      </div>
    </div>
  </td></tr>

  <!-- CHIFFRES -->
  <tr><td style="padding:0 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;padding:0 6px 0 0;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#e8944a;line-height:1;">70%</div>
            <div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">des millennials consultent Instagram avant de choisir un restaurant</div>
          </div>
        </td>
        <td style="width:33%;padding:0 3px;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#e8944a;line-height:1;">+20%</div>
            <div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">de réservations pour les restaurants actifs sur Instagram</div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 6px;">
          <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:#e8944a;line-height:1;">5 000</div>
            <div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">nouvelles personnes par post bien construit</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CE QU'ON FAIT -->
  <tr><td style="padding:0 28px 20px;">
    <div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;">
      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on gère pour vous</p>
      <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Création et optimisation complète du compte Instagram</p>
      <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ Stratégie éditoriale sur mesure (hashtags, horaires, tonalité)</p>
      <p style="margin:0 0 8px;color:#ffffff;font-size:13px;">✓ 12 posts/mois rédigés + visuels créés</p>
      <p style="margin:0;color:#ffffff;font-size:13px;">✓ Reporting mensuel des performances</p>
    </div>
  </td></tr>

  <!-- TARIF -->
  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #c0392b;border-radius:8px;padding:20px 24px;text-align:center;background:#fff5f5;">
      <div style="font-size:13px;color:#c0392b;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px;">Offre limitée</div>
      <div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">300€<span style="font-size:18px;color:#888;">/mois</span></div>
      <div style="font-size:14px;color:#c0392b;font-weight:700;margin-top:8px;">Premier mois offert si signature avant vendredi</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Gestion%20Instagram%20Le%20P%27tit%20Bistrot&body=Bonjour%2C%0A%0AJe%20suis%20int%C3%A9ress%C3%A9%20par%20la%20gestion%20de%20mon%20compte%20Instagram.%0A%0AMon%20restaurant%20%3A%20Le%20P%27tit%20Bistrot%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#ffffff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux être sur Instagram →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
};

// ─────────────────────────────────────────────
// EMAIL 4 — Pitch influenceurs
// ─────────────────────────────────────────────
const email4 = {
  from: FROM,
  to: TO,
  subject: 'Et si 50 000 personnes découvraient votre restaurant ce mois-ci ?',
  html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Influenceurs</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;">

  <!-- HEADER -->
  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#ffffff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <!-- IMAGE HERO -->
  <tr><td style="padding:0;margin:0;">
    <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80" alt="Influenceur lifestyle restaurant" width="600" style="width:100%;display:block;max-width:600px;" />
  </td></tr>

  <!-- ACCROCHE -->
  <tr><td style="padding:28px 28px 20px;">
    <p style="margin:0 0 16px;font-size:20px;font-weight:900;color:#1a1a1a;line-height:1.3;">Un micro-influenceur food à Paris avec 50 000 abonnés publie une story dans votre restaurant.<br><span style="color:#e8944a;">Le lendemain : 200 nouvelles réservations.</span></p>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">Ce n'est pas une hypothèse — c'est ce qui arrive chaque semaine à vos concurrents. Pendant que vous attendez, ils remplissent leurs salles via des influenceurs food parisiens.</p>
  </td></tr>

  <!-- TABLEAU COMPARATIF -->
  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Comparatif des canaux d'acquisition</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#1a1a1a;">
        <td style="padding:12px 14px;color:#ffffff;font-size:12px;font-weight:700;width:34%;">Critère</td>
        <td style="padding:12px 10px;color:#aaa;font-size:12px;font-weight:700;text-align:center;width:22%;">Google Ads</td>
        <td style="padding:12px 10px;color:#aaa;font-size:12px;font-weight:700;text-align:center;width:22%;">Meta Ads</td>
        <td style="padding:12px 10px;color:#e8944a;font-size:12px;font-weight:700;text-align:center;width:22%;">Micro-influenceur</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:12px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Coût pour 10 000 vues</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#555;border-bottom:1px solid #eee;">300–500€</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#555;border-bottom:1px solid #eee;">150–300€</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#e8944a;font-weight:700;border-bottom:1px solid #eee;">150–300€</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:12px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Confiance de l'audience</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Faible</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Faible</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Très haute</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:12px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Contenu réutilisable</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Non</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Non</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Oui (photos/vidéos)</td>
      </tr>
      <tr style="background:#ffffff;">
        <td style="padding:12px 14px;font-size:13px;color:#333;">Durée de vie</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;">0 après arrêt</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#dc2626;">0 après arrêt</td>
        <td style="padding:12px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;">Permanent</td>
      </tr>
    </table>
  </td></tr>

  <!-- IMAGE + COMMENT CA MARCHE -->
  <tr><td style="padding:0 28px 24px;">
    <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=544&q=80" alt="Influenceur food" width="544" style="width:100%;display:block;border-radius:8px;margin-bottom:20px;" />
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Comment ça marche</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;padding-bottom:16px;">
          <div style="display:inline-block;width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">1</div>
          <div style="overflow:hidden;">
            <strong style="font-size:14px;color:#1a1a1a;">Sélection des influenceurs</strong>
            <p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">On identifie 3 micro-influenceurs food Paris (10k–100k abonnés) qui correspondent exactement à votre univers et à votre clientèle cible.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-bottom:16px;">
          <div style="display:inline-block;width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">2</div>
          <div style="overflow:hidden;">
            <strong style="font-size:14px;color:#1a1a1a;">On gère tout</strong>
            <p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">Contact, brief créatif, organisation de la visite, validation du contenu avant publication. Vous n'avez rien à gérer.</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;">
          <div style="display:inline-block;width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">3</div>
          <div style="overflow:hidden;">
            <strong style="font-size:14px;color:#1a1a1a;">Vous recevez les résultats</strong>
            <p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">Photos et vidéos professionnelles à conserver + rapport de performance détaillé avec vues, engagement et estimation des nouvelles réservations.</p>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- RÉSULTATS ATTENDUS -->
  <tr><td style="padding:0 28px 20px;">
    <div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:20px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Résultats estimés par influenceur</p>
      <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.8;">
        5 000 à 15 000 vues · 2 à 5% de conversion<br>
        <strong style="font-size:17px;">= 100 à 750 nouveaux clients potentiels</strong>
      </p>
    </div>
  </td></tr>

  <!-- TARIF -->
  <tr><td style="padding:0 28px 28px;">
    <div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;">
      <div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">3 influenceurs inclus</div>
      <div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">500€<span style="font-size:18px;color:#888;">/mois</span></div>
      <div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Contact, brief, visite, contenu, rapport — tout géré</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Campagne%20influenceurs%20restaurant&body=Bonjour%2C%0A%0AJe%20souhaite%20tester%20une%20campagne%20micro-influenceurs%20pour%20mon%20restaurant.%0A%0AMon%20restaurant%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#ffffff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux tester avec un influenceur →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;">
    <p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
};

// ─────────────────────────────────────────────
// ENVOI SÉQUENTIEL
// ─────────────────────────────────────────────
const emails = [
  { label: 'Email 1 — Salon Lumière (Google My Business)', mail: email1 },
  { label: 'Email 2 — Fadiman Coiffure (Site web)', mail: email2 },
  { label: "Email 3 — Le P'tit Bistrot (Instagram)", mail: email3 },
  { label: 'Email 4 — Restaurant (Influenceurs)', mail: email4 },
];

for (const { label, mail } of emails) {
  try {
    const info = await transporter.sendMail(mail);
    console.log(`✅ ${label} — envoyé (${info.messageId})`);
  } catch (err) {
    console.error(`❌ ${label} — erreur : ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}

console.log('\nCampagne terminée — 4 emails envoyés.');
