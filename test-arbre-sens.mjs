import nodemailer from 'nodemailer';
import Groq from 'groq-sdk';
import { captureAndAnnotate, screenshotHtml } from '/Users/jimmychoisy/dev/copycraft/screenshot.mjs';

const groq = new Groq({ apiKey: 'process.env.GROQ_API_KEY' });

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net', port: 465, secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
});

const lead = {
  nom: 'Arbre à Sens Paris',
  website: 'https://www.arbreasens.fr/',
  email: 'jimmychoisy92@gmail.com',
};

async function fetchWebsite(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,3000);
  } catch { return null; }
}

async function analyzeWithGroq(nomInstitut, url, pageText) {
  const prompt = `Tu es un expert copywriter. Analyse cette page d'accueil d'un spa/institut de beauté et identifie 3 problèmes CONCRETS et SPÉCIFIQUES qui freinent les réservations.

Institut : ${nomInstitut}
URL : ${url}

Texte de la page :
${pageText}

Règles strictes :
- Cite des éléments RÉELS de leur page (un vrai titre, une vraie phrase, une vraie absence)
- Pas de généralités — sois précis sur CE QUI EST écrit ou absent sur CETTE page
- Ton sobre, direct, professionnel
- point1 : problème complet avec explication (2 phrases max)
- point2 et point3 : juste le thème du problème en une phrase courte, sans la solution

Réponds UNIQUEMENT avec ce format JSON :
{
  "point1": "...",
  "point2_apercu": "...",
  "point3_apercu": "..."
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });
  try {
    const text = response.choices[0].message.content;
    const json = text.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(json);
  } catch { return null; }
}

async function generateAfterContent(nomInstitut, pageText) {
  const prompt = `Tu es expert copywriter. Pour ce spa/institut de beauté, génère uniquement du contenu texte percutant.

Institut : ${nomInstitut}
Contexte page actuelle : ${pageText.slice(0, 800)}

Réponds UNIQUEMENT avec ce JSON :
{
  "titre": "Un titre accrocheur de max 10 mots qui dit ce que l'institut apporte",
  "soustitre": "Une promesse émotionnelle en 15 mots max",
  "benefit1": "Bénéfice court 4 mots max",
  "benefit2": "Bénéfice court 4 mots max",
  "benefit3": "Bénéfice court 4 mots max",
  "temoignage": "Un avis client fictif crédible et chaleureux en 2 phrases",
  "prenom_client": "Prénom féminin + âge"
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });
  try {
    const text = response.choices[0].message.content;
    const json = text.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(json);
  } catch {
    return {
      titre: `${nomInstitut} — Révélez votre beauté naturelle`,
      soustitre: "Des soins personnalisés pour chaque femme",
      benefit1: "Soins sur mesure", benefit2: "Expertise reconnue", benefit3: "Résultats visibles",
      temoignage: "Une expérience exceptionnelle, je me suis sentie vraiment écoutée. Les résultats sont là dès la première séance.",
      prenom_client: "Sophie, 34 ans"
    };
  }
}

const TEMPLATES = [
  (nom, c) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Georgia,serif;background:#fff;width:1280px;}
  nav{display:flex;justify-content:space-between;align-items:center;padding:20px 60px;background:#fff;border-bottom:1px solid #f0e6e6;}
  nav .logo{font-size:16px;letter-spacing:4px;color:#8b4a6b;text-transform:uppercase;}
  nav ul{display:flex;gap:36px;list-style:none;}
  nav ul li a{color:#8b4a6b;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;}
  .hero{position:relative;height:500px;background:linear-gradient(135deg,#f9e8ef 0%,#fdf0f5 50%,#f5e6f0 100%);display:flex;align-items:center;overflow:hidden;}
  .hero::after{content:'';position:absolute;right:0;top:0;width:50%;height:100%;background:url('https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=700&q=80') center/cover;opacity:0.6;}
  .hero-content{position:relative;z-index:1;padding:0 80px;max-width:580px;}
  .tag{display:inline-block;background:#d4a0b5;color:#fff;font-family:Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;padding:5px 14px;margin-bottom:20px;border-radius:20px;}
  h1{font-size:40px;line-height:1.25;color:#3d1c2e;font-weight:normal;margin-bottom:16px;}
  .sub{font-size:16px;color:#7a4060;font-style:italic;line-height:1.6;margin-bottom:32px;}
  .cta{display:inline-block;background:#8b4a6b;color:#fff;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:16px 36px;text-decoration:none;border-radius:2px;}
  .benefits{display:flex;background:#fdf7f9;border-top:1px solid #f0dde8;}
  .benefit{flex:1;padding:32px 36px;border-right:1px solid #f0dde8;text-align:center;}
  .benefit:last-child{border-right:none;}
  .benefit h3{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b4a6b;margin-bottom:6px;}
  .testimonial{background:#fff;padding:50px 80px;border-top:2px solid #f9e8ef;}
  .stars{color:#d4a0b5;font-size:16px;margin-bottom:10px;}
  blockquote{font-size:17px;font-style:italic;color:#5a3048;line-height:1.8;margin-bottom:12px;}
  .author{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b07090;}
</style></head><body>
<nav><div class="logo">${nom}</div><ul><li><a href="#">Soins</a></li><li><a href="#">L'Institut</a></li><li><a href="#">Tarifs</a></li><li><a href="#" style="color:#8b4a6b;font-weight:bold;">Réserver</a></li></ul></nav>
<div class="hero"><div class="hero-content"><div class="tag">Spa &amp; Institut</div><h1>${c.titre}</h1><p class="sub">${c.soustitre}</p><a href="#" class="cta">Réserver ma séance →</a></div></div>
<div class="benefits"><div class="benefit"><h3>${c.benefit1}</h3></div><div class="benefit"><h3>${c.benefit2}</h3></div><div class="benefit"><h3>${c.benefit3}</h3></div></div>
<div class="testimonial"><div class="stars">★★★★★</div><blockquote>"${c.temoignage}"</blockquote><div class="author">— ${c.prenom_client}</div></div>
</body></html>`,

  (nom, c) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Georgia,serif;background:#faf7f2;width:1280px;}
  nav{display:flex;justify-content:space-between;align-items:center;padding:22px 60px;background:#faf7f2;border-bottom:1px solid #e8ddd0;}
  nav .logo{font-size:18px;letter-spacing:5px;color:#6b5344;text-transform:uppercase;font-style:italic;}
  nav ul{display:flex;gap:40px;list-style:none;}
  nav ul li a{color:#9a7b6a;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;}
  .hero{display:grid;grid-template-columns:1fr 1fr;height:480px;background:#faf7f2;}
  .hero-left{padding:60px 70px;display:flex;flex-direction:column;justify-content:center;}
  .hero-right{background:url('https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&q=80') center/cover;}
  .line{width:40px;height:2px;background:#c9a07a;margin-bottom:24px;}
  h1{font-size:38px;line-height:1.3;color:#3d2b1f;font-weight:normal;margin-bottom:18px;}
  .sub{font-size:15px;color:#8a6a5a;font-style:italic;line-height:1.7;margin-bottom:36px;}
  .cta{display:inline-block;background:transparent;border:2px solid #c9a07a;color:#6b5344;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;padding:16px 36px;text-decoration:none;}
  .benefits{display:flex;background:#f2ece3;border-top:1px solid #e0d0c0;}
  .benefit{flex:1;padding:32px 40px;border-right:1px solid #e0d0c0;text-align:center;}
  .benefit:last-child{border-right:none;}
  .benefit h3{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a07a;}
  .testimonial{background:#fff;padding:50px 80px;border-top:1px solid #e8ddd0;display:flex;gap:40px;align-items:center;}
  .quote-mark{font-size:80px;color:#e8d0b8;line-height:0.6;font-family:Georgia;}
  blockquote{font-size:16px;font-style:italic;color:#5a3d2b;line-height:1.9;margin-bottom:12px;}
  .stars{color:#c9a07a;margin-bottom:8px;}
  .author{font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a07a;}
</style></head><body>
<nav><div class="logo">${nom}</div><ul><li><a href="#">Soins</a></li><li><a href="#">L'Institut</a></li><li><a href="#">Tarifs</a></li><li><a href="#" style="color:#c9a07a;">Réserver</a></li></ul></nav>
<div class="hero"><div class="hero-left"><div class="line"></div><h1>${c.titre}</h1><p class="sub">${c.soustitre}</p><a href="#" class="cta">Réserver ma séance →</a></div><div class="hero-right"></div></div>
<div class="benefits"><div class="benefit"><h3>${c.benefit1}</h3></div><div class="benefit"><h3>${c.benefit2}</h3></div><div class="benefit"><h3>${c.benefit3}</h3></div></div>
<div class="testimonial"><div class="quote-mark">"</div><div><div class="stars">★★★★★</div><blockquote>${c.temoignage}</blockquote><div class="author">— ${c.prenom_client}</div></div></div>
</body></html>`,

  (nom, c) => `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Arial',sans-serif;background:#fff;width:1280px;}
  nav{display:flex;justify-content:space-between;align-items:center;padding:20px 60px;background:#fff;border-bottom:1px solid #e8ede8;}
  nav .logo{font-size:14px;letter-spacing:6px;color:#2d4a2d;text-transform:uppercase;}
  nav ul{display:flex;gap:40px;list-style:none;}
  nav ul li a{color:#6a8a6a;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;}
  .hero{position:relative;height:500px;background:#f5f8f5;display:flex;align-items:center;overflow:hidden;}
  .hero::after{content:'';position:absolute;right:0;top:0;width:55%;height:100%;background:url('https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=700&q=80') center/cover;opacity:0.85;}
  .hero-content{position:relative;z-index:1;padding:0 80px;max-width:560px;}
  .tag{display:inline-block;background:#8fa98f;color:#fff;font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;padding:5px 14px;margin-bottom:22px;}
  h1{font-size:40px;line-height:1.2;color:#1a2e1a;font-weight:bold;margin-bottom:16px;font-family:Georgia,serif;}
  .sub{font-size:15px;color:#4a6a4a;font-style:italic;line-height:1.7;margin-bottom:32px;}
  .cta{display:inline-block;background:#2d4a2d;color:#fff;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:16px 36px;text-decoration:none;}
  .benefits{display:flex;background:#f0f5f0;border-top:1px solid #dde8dd;}
  .benefit{flex:1;padding:30px 36px;border-right:1px solid #dde8dd;text-align:center;}
  .benefit:last-child{border-right:none;}
  .benefit h3{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4a7a4a;}
  .testimonial{background:#fff;padding:48px 80px;border-top:3px solid #8fa98f;}
  .stars{color:#8fa98f;font-size:16px;margin-bottom:10px;}
  blockquote{font-size:17px;font-style:italic;color:#2d3d2d;line-height:1.8;margin-bottom:12px;font-family:Georgia,serif;}
  .author{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6a8a6a;}
</style></head><body>
<nav><div class="logo">${nom}</div><ul><li><a href="#">Soins</a></li><li><a href="#">L'Institut</a></li><li><a href="#">Tarifs</a></li><li><a href="#" style="color:#2d4a2d;font-weight:bold;">Réserver</a></li></ul></nav>
<div class="hero"><div class="hero-content"><div class="tag">Spa &amp; Bien-être</div><h1>${c.titre}</h1><p class="sub">${c.soustitre}</p><a href="#" class="cta">Réserver ma séance →</a></div></div>
<div class="benefits"><div class="benefit"><h3>${c.benefit1}</h3></div><div class="benefit"><h3>${c.benefit2}</h3></div><div class="benefit"><h3>${c.benefit3}</h3></div></div>
<div class="testimonial"><div class="stars">★★★★★</div><blockquote>"${c.temoignage}"</blockquote><div class="author">— ${c.prenom_client}</div></div>
</body></html>`,
];

async function main() {
  console.log(`🔍 Analyse de ${lead.nom}...`);
  const pageText = await fetchWebsite(lead.website);
  if (!pageText) { console.log('❌ Site inaccessible'); return; }
  console.log('✅ Site récupéré');

  const points = await analyzeWithGroq(lead.nom, lead.website, pageText);
  if (!points) { console.log('❌ Analyse échouée'); return; }
  console.log('\n📋 Points :');
  console.log(`1. ${points.point1}`);
  console.log(`2. ${points.point2_apercu}`);
  console.log(`3. ${points.point3_apercu}`);

  console.log('\n📸 Screenshot AVANT...');
  const screenshotBefore = await captureAndAnnotate(lead.website, [
    { x: 5, y: 15, text: points.point1.slice(0, 90) },
    { x: 5, y: 45, text: points.point2_apercu || 'Opportunité n°2' },
    { x: 5, y: 70, text: points.point3_apercu || 'Opportunité n°3' },
  ]);
  console.log(`✅ AVANT : ${screenshotBefore}`);

  console.log('\n✨ Génération 3 mockups APRÈS...');
  const content = await generateAfterContent(lead.nom, pageText);
  const screenshots = [];
  for (let i = 0; i < 3; i++) {
    const html = TEMPLATES[i](lead.nom, content);
    const path = await screenshotHtml(html);
    screenshots.push(path);
    console.log(`✅ Version ${i+1} : ${path}`);
  }

  const accroches = [
    (nom) => `En analysant le site de ${nom}, j'ai identifié 3 opportunités concrètes pour convertir davantage de visiteuses en clientes.`,
    (nom) => `Je me suis permis de visiter le site de ${nom} et j'ai repéré 3 ajustements qui pourraient significativement augmenter vos réservations en ligne.`,
    (nom) => `En tant que copywriter spécialisé dans les spas et instituts de beauté, j'ai analysé le site de ${nom} et j'ai quelques pistes concrètes qui pourraient vous ramener davantage de clientes.`,
  ];
  const accroche = accroches[Math.floor(Math.random() * accroches.length)](lead.nom);
  const subject = `Votre site — quelques pistes pour plus de réservations`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px 0;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px 8px 0 0;">
        <tr><td align="center" style="padding:28px 40px;">
          <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:2px;">THE COPY CRAFT</span><br>
          <span style="font-size:11px;color:#999;letter-spacing:3px;text-transform:uppercase;">Audit · Copywriting · Conversion</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 20px 30px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:0 0 8px 8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="padding:40px;">
          <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">Bonjour,</p>
          <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 32px;">${accroche}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:#fff8f0;border-left:4px solid #e8944a;border-radius:0 6px 6px 0;padding:20px 24px;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#e8944a;letter-spacing:2px;text-transform:uppercase;">Point n°1 — Révélé</p>
              <p style="margin:0;font-size:14px;color:#333;line-height:1.7;">${points.point1}</p>
            </td></tr>
          </table>
          <p style="font-family:Arial,sans-serif;font-size:13px;color:#666;margin:0 0 16px;">J'ai également identifié <strong>2 autres points critiques</strong> sur votre site :</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr><td style="background:#f9f9f9;border:1px dashed #ddd;border-radius:6px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Point n°2</p>
              <p style="margin:0;font-size:14px;color:#aaa;font-style:italic;">${points.point2_apercu} — <span style="background:#ddd;color:#ddd;border-radius:3px;">détail masqué</span></p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
            <tr><td style="background:#f9f9f9;border:1px dashed #ddd;border-radius:6px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Point n°3</p>
              <p style="margin:0;font-size:14px;color:#aaa;font-style:italic;">${points.point3_apercu} — <span style="background:#ddd;color:#ddd;border-radius:3px;">détail masqué</span></p>
            </td></tr>
          </table>
          <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#e8944a;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">▼ VOTRE SITE ACTUEL</p>
          <img src="cid:screenbefore" style="width:100%;border-radius:8px;border:3px solid #e8944a;margin-bottom:28px;display:block;" alt="Votre site actuel"/>
          <p style="text-align:center;font-size:28px;margin:0 0 16px;color:#1a1a1a;">↓</p>
          <p style="text-align:center;font-family:Arial,sans-serif;font-size:13px;color:#666;margin:0 0 24px;">Ce que je vous propose à la place</p>
          <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#b07a9a;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">▼ VERSION 1 — Rose &amp; Féminin</p>
          <img src="cid:screenafter1" style="width:100%;border-radius:8px;border:3px solid #d4a0b5;margin-bottom:28px;display:block;" alt="Version 1"/>
          <p style="font-family:Arial,sans-serif;font-size:14px;color:#333;margin:0 0 20px;font-weight:bold;">Deux autres directions possibles :</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td style="border-radius:8px;overflow:hidden;border:2px solid #e0d0b8;">
              <img src="cid:screenafter2" style="width:100%;display:block;filter:blur(8px);opacity:0.35;" alt="Version 2"/>
              <div style="background:rgba(250,247,242,0.92);padding:20px;text-align:center;border-top:1px solid #e0d0b8;">
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#9a7b6a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Version 2 — Beige &amp; Luxe</p>
                <a href="mailto:contact@thecopycraft.fr?subject=Version 2" style="display:inline-block;background:#c9a07a;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;text-decoration:none;border-radius:2px;">Voir cette version →</a>
              </div>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="border-radius:8px;overflow:hidden;border:2px solid #dde8dd;">
              <img src="cid:screenafter3" style="width:100%;display:block;filter:blur(8px);opacity:0.35;" alt="Version 3"/>
              <div style="background:rgba(245,248,245,0.92);padding:20px;text-align:center;border-top:1px solid #dde8dd;">
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#4a6a4a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Version 3 — Vert Sauge &amp; Minimaliste</p>
                <a href="mailto:contact@thecopycraft.fr?subject=Version 3" style="display:inline-block;background:#4a7a4a;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;text-decoration:none;border-radius:2px;">Voir cette version →</a>
              </div>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
            <tr><td align="center">
              <a href="mailto:contact@thecopycraft.fr?subject=Oui, je veux l'analyse complète" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 36px;border-radius:4px;letter-spacing:1px;">Oui, je veux l'analyse complète →</a>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.6;">
            Bonne journée,<br>
            <strong style="color:#1a1a1a;">TheCopyCraft</strong><br>
            <a href="mailto:contact@thecopycraft.fr" style="color:#e8944a;text-decoration:none;">contact@thecopycraft.fr</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: '"TheCopyCraft" <contact@thecopycraft.fr>',
    to: lead.email,
    subject,
    html,
    text: `Bonjour,\n\n${accroche}\n\n1. ${points.point1}\n\n2. ${points.point2_apercu}\n\n3. ${points.point3_apercu}\n\nTheCopyCraft\ncontact@thecopycraft.fr`,
    attachments: [
      { filename: 'avant.png', path: screenshotBefore, cid: 'screenbefore' },
      { filename: 'apres1.png', path: screenshots[0], cid: 'screenafter1' },
      { filename: 'apres2.png', path: screenshots[1], cid: 'screenafter2' },
      { filename: 'apres3.png', path: screenshots[2], cid: 'screenafter3' },
    ]
  });

  console.log(`\n📧 Email test envoyé à ${lead.email}`);
  console.log(`\nScreenshots sauvegardés:`);
  console.log(`  AVANT: ${screenshotBefore}`);
  screenshots.forEach((s, i) => console.log(`  APRÈS ${i+1}: ${s}`));
}

main().catch(console.error);
